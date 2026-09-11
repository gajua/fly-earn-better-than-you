use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Read,
    net::TcpListener,
    path::{Path, PathBuf},
    sync::{Arc, Mutex, RwLock},
    thread,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter};
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

const MAX_BODY_BYTES: usize = 64 * 1024;
const MAX_OBSERVATION_AGE_MS: u64 = 30_000;
const MAX_FUTURE_SKEW_MS: u64 = 5_000;

#[derive(Debug)]
pub struct BridgeRuntime {
    port: u16,
    token: String,
    paired_origin: RwLock<Option<String>>,
    config_path: PathBuf,
    last_request_ms: Mutex<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeStatus {
    pub is_running: bool,
    pub port: u16,
    pub paired_origin: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PairingDetails {
    pub is_running: bool,
    pub port: u16,
    pub paired_origin: Option<String>,
    pub token: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
struct BridgeConfig {
    paired_origin: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ObservationRequest {
    kind: String,
    source: String,
    captured_at: String,
    environment: MarketEnvironment,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct MarketEnvironment {
    asset: Option<AssetSnapshot>,
    position: Option<PositionSnapshot>,
    market: MarketSnapshot,
    ui: UiSnapshot,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct AssetSnapshot {
    symbol: String,
    name: Option<String>,
    price: f64,
    #[serde(rename = "changePercent")]
    change_percent: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PositionSnapshot {
    quantity: f64,
    average_price: f64,
    pnl_amount: f64,
    pnl_percent: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct MarketSnapshot {
    momentum: f64,
    volatility: f64,
    #[serde(rename = "volumeStrength")]
    volume_strength: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct UiSnapshot {
    chart: Option<ScreenRect>,
    buy: Option<ScreenRect>,
    sell: Option<ScreenRect>,
    portfolio: Option<ScreenRect>,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ScreenRect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MarketObservation {
    observed_at_ms: u64,
    environment: MarketEnvironment,
}

#[cfg(test)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopMode {
    IdleDesktop,
    MarketObserving,
    LeaveMarket,
}

#[cfg(test)]
pub fn next_desktop_mode(
    current: DesktopMode,
    has_fresh_observation: bool,
    has_market_target: bool,
) -> DesktopMode {
    if has_fresh_observation {
        DesktopMode::MarketObserving
    } else if current == DesktopMode::MarketObserving && has_market_target {
        DesktopMode::LeaveMarket
    } else {
        DesktopMode::IdleDesktop
    }
}

impl BridgeRuntime {
    pub fn start(app: AppHandle, config_path: PathBuf) -> Result<Arc<Self>, String> {
        let listener =
            TcpListener::bind(("127.0.0.1", 0)).map_err(|error| error.to_string())?;
        let port = listener
            .local_addr()
            .map_err(|error| error.to_string())?
            .port();
        let paired_origin = load_config(&config_path)
            .ok()
            .map(|config| config.paired_origin);
        let runtime = Arc::new(Self {
            port,
            token: generate_token(),
            paired_origin: RwLock::new(paired_origin),
            config_path,
            last_request_ms: Mutex::new(0),
        });
        let server_runtime = Arc::clone(&runtime);

        thread::Builder::new()
            .name("fly-local-observation-bridge".into())
            .spawn(move || {
                let server = match Server::from_listener(listener, None) {
                    Ok(server) => server,
                    Err(error) => {
                        eprintln!("[fly] local bridge failed to start: {error}");
                        return;
                    }
                };
                for request in server.incoming_requests() {
                    handle_request(request, &server_runtime, &app);
                }
            })
            .map_err(|error| error.to_string())?;

        Ok(runtime)
    }

    pub fn status(&self) -> BridgeStatus {
        BridgeStatus {
            is_running: true,
            port: self.port,
            paired_origin: self
                .paired_origin
                .read()
                .expect("paired-origin lock poisoned")
                .clone(),
        }
    }

    pub fn pair_extension(&self, extension_id: &str) -> Result<PairingDetails, String> {
        let origin = extension_origin(extension_id)?;
        save_config(
            &self.config_path,
            &BridgeConfig {
                paired_origin: origin.clone(),
            },
        )?;
        *self
            .paired_origin
            .write()
            .map_err(|_| "paired-origin lock poisoned".to_string())? = Some(origin.clone());

        Ok(PairingDetails {
            is_running: true,
            port: self.port,
            paired_origin: Some(origin),
            token: self.token.clone(),
        })
    }
}

fn handle_request(mut request: Request, runtime: &BridgeRuntime, app: &AppHandle) {
    let configured_origin = runtime
        .paired_origin
        .read()
        .expect("paired-origin lock poisoned")
        .clone();
    let request_origin = header_value(&request, "Origin");

    let Some(allowed_origin) = configured_origin else {
        respond_json(request, 403, r#"{"error":"bridge_not_paired"}"#, None);
        return;
    };
    if request_origin.as_deref() != Some(allowed_origin.as_str()) {
        respond_json(request, 403, r#"{"error":"origin_not_allowed"}"#, None);
        return;
    }
    if request.method() == &Method::Options {
        respond_json(request, 204, "", Some(&allowed_origin));
        return;
    }
    if header_value(&request, "X-Fly-Extension-Origin").as_deref()
        != Some(allowed_origin.as_str())
    {
        respond_json(request, 403, r#"{"error":"origin_header_mismatch"}"#, None);
        return;
    }

    let authorization = header_value(&request, "Authorization");
    let expected = format!("Bearer {}", runtime.token);
    if !constant_time_eq(
        authorization.as_deref().unwrap_or_default().as_bytes(),
        expected.as_bytes(),
    ) {
        respond_json(
            request,
            401,
            r#"{"error":"invalid_authorization"}"#,
            Some(&allowed_origin),
        );
        return;
    }

    match (request.method(), request.url()) {
        (&Method::Get, "/health") => {
            respond_json(
                request,
                200,
                r#"{"ok":true,"capability":"observation-only"}"#,
                Some(&allowed_origin),
            );
        }
        (&Method::Post, "/v1/environment") => {
            if header_value(&request, "Content-Type").as_deref()
                != Some("application/json")
            {
                respond_json(
                    request,
                    415,
                    r#"{"error":"content_type_required"}"#,
                    Some(&allowed_origin),
                );
                return;
            }
            if request.body_length().unwrap_or(MAX_BODY_BYTES + 1) > MAX_BODY_BYTES {
                respond_json(
                    request,
                    413,
                    r#"{"error":"body_too_large"}"#,
                    Some(&allowed_origin),
                );
                return;
            }
            let mut body = Vec::new();
            if request
                .as_reader()
                .take((MAX_BODY_BYTES + 1) as u64)
                .read_to_end(&mut body)
                .is_err()
                || body.len() > MAX_BODY_BYTES
            {
                respond_json(
                    request,
                    413,
                    r#"{"error":"body_too_large"}"#,
                    Some(&allowed_origin),
                );
                return;
            }
            let payload = match serde_json::from_slice::<ObservationRequest>(&body) {
                Ok(payload) => payload,
                Err(_) => {
                    respond_json(
                        request,
                        400,
                        r#"{"error":"invalid_schema"}"#,
                        Some(&allowed_origin),
                    );
                    return;
                }
            };
            let now = now_ms();
            if let Err(error) = validate_observation(&payload, now) {
                let body = format!(r#"{{"error":"{error}"}}"#);
                respond_json(request, 422, &body, Some(&allowed_origin));
                return;
            }
            let mut last_request = runtime
                .last_request_ms
                .lock()
                .expect("rate-limit lock poisoned");
            if now.saturating_sub(*last_request) < 250 {
                respond_json(
                    request,
                    429,
                    r#"{"error":"rate_limited"}"#,
                    Some(&allowed_origin),
                );
                return;
            }
            *last_request = now;

            let observation = MarketObservation {
                observed_at_ms: now,
                environment: payload.environment,
            };
            if app.emit_to("main", "market-observation", observation).is_err() {
                respond_json(
                    request,
                    503,
                    r#"{"error":"overlay_unavailable"}"#,
                    Some(&allowed_origin),
                );
                return;
            }
            respond_json(
                request,
                202,
                r#"{"accepted":true}"#,
                Some(&allowed_origin),
            );
        }
        _ => respond_json(
            request,
            404,
            r#"{"error":"not_found"}"#,
            Some(&allowed_origin),
        ),
    }
}

fn validate_observation(payload: &ObservationRequest, now: u64) -> Result<(), &'static str> {
    if payload.kind != "market-environment" || payload.source != "demo" {
        return Err("unsupported_sensor");
    }
    let captured = chrono::DateTime::parse_from_rfc3339(&payload.captured_at)
        .map_err(|_| "invalid_capture_time")?
        .timestamp_millis();
    if captured < 0 {
        return Err("invalid_capture_time");
    }
    let captured = captured as u64;
    if captured.saturating_add(MAX_OBSERVATION_AGE_MS) < now
        || captured > now.saturating_add(MAX_FUTURE_SKEW_MS)
    {
        return Err("observation_expired");
    }
    let environment = &payload.environment;
    for rect in [
        environment.ui.chart,
        environment.ui.buy,
        environment.ui.sell,
        environment.ui.portfolio,
    ]
    .into_iter()
    .flatten()
    {
        if !valid_rect(rect) {
            return Err("invalid_viewport_bounds");
        }
    }
    if environment
        .asset
        .as_ref()
        .is_some_and(|asset| asset.symbol.is_empty() || asset.symbol.len() > 32)
        || !environment.market.momentum.is_finite()
        || !(-1.0..=1.0).contains(&environment.market.momentum)
        || !environment.market.volatility.is_finite()
        || !(0.0..=1.0).contains(&environment.market.volatility)
        || !environment.market.volume_strength.is_finite()
        || !(0.0..=1.0).contains(&environment.market.volume_strength)
    {
        return Err("invalid_market_values");
    }
    Ok(())
}

fn valid_rect(rect: ScreenRect) -> bool {
    [rect.x, rect.y, rect.width, rect.height]
        .iter()
        .all(|value| value.is_finite())
        && rect.width > 0.0
        && rect.height > 0.0
        && rect.width <= 100_000.0
        && rect.height <= 100_000.0
}

fn extension_origin(extension_id: &str) -> Result<String, String> {
    if extension_id.len() != 32
        || !extension_id
            .bytes()
            .all(|byte| (b'a'..=b'p').contains(&byte))
    {
        return Err("extension ID must be 32 lowercase characters from a through p".into());
    }
    Ok(format!("chrome-extension://{extension_id}"))
}

fn generate_token() -> String {
    let mut bytes = [0_u8; 32];
    OsRng.fill_bytes(&mut bytes);
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }
    left.iter()
        .zip(right)
        .fold(0_u8, |difference, (a, b)| difference | (a ^ b))
        == 0
}

fn load_config(path: &Path) -> Result<BridgeConfig, String> {
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    let config: BridgeConfig =
        serde_json::from_slice(&bytes).map_err(|error| error.to_string())?;
    let id = config
        .paired_origin
        .strip_prefix("chrome-extension://")
        .ok_or_else(|| "invalid paired origin".to_string())?;
    extension_origin(id)?;
    Ok(config)
}

fn save_config(path: &Path, config: &BridgeConfig) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "invalid config path".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let temporary_path = path.with_extension("tmp");
    let bytes = serde_json::to_vec(config).map_err(|error| error.to_string())?;
    fs::write(&temporary_path, bytes).map_err(|error| error.to_string())?;
    fs::rename(temporary_path, path).map_err(|error| error.to_string())
}

fn header_value(request: &Request, name: &str) -> Option<String> {
    request
        .headers()
        .iter()
        .find(|header| header.field.to_string().eq_ignore_ascii_case(name))
        .map(|header| header.value.as_str().to_owned())
}

fn response_header(name: &[u8], value: &str) -> Header {
    Header::from_bytes(name, value.as_bytes()).expect("static response header must be valid")
}

fn respond_json(request: Request, status: u16, body: &str, origin: Option<&str>) {
    let mut response = Response::from_string(body)
        .with_status_code(StatusCode(status))
        .with_header(response_header(b"Content-Type", "application/json"));
    if let Some(origin) = origin {
        response.add_header(response_header(b"Access-Control-Allow-Origin", origin));
        response.add_header(response_header(b"Vary", "Origin"));
        response.add_header(response_header(
            b"Access-Control-Allow-Headers",
            "Authorization, Content-Type, X-Fly-Extension-Origin",
        ));
        response.add_header(response_header(
            b"Access-Control-Allow-Methods",
            "GET, POST, OPTIONS",
        ));
    }
    let _ = request.respond(response);
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn observation(now: u64) -> ObservationRequest {
        ObservationRequest {
            kind: "market-environment".into(),
            source: "demo".into(),
            captured_at: chrono::DateTime::from_timestamp_millis(now as i64)
                .unwrap()
                .to_rfc3339(),
            environment: MarketEnvironment {
                asset: Some(AssetSnapshot {
                    symbol: "TEST".into(),
                    name: None,
                    price: 100.0,
                    change_percent: 1.0,
                }),
                position: None,
                market: MarketSnapshot {
                    momentum: 0.2,
                    volatility: 0.4,
                    volume_strength: 0.5,
                },
                ui: UiSnapshot {
                    chart: Some(ScreenRect {
                        x: 100.0,
                        y: 80.0,
                        width: 800.0,
                        height: 500.0,
                    }),
                    buy: None,
                    sell: None,
                    portfolio: None,
                },
            },
        }
    }

    #[test]
    fn authentication_comparison_is_exact() {
        assert!(constant_time_eq(b"Bearer correct", b"Bearer correct"));
        assert!(!constant_time_eq(b"Bearer wrong", b"Bearer correct"));
        assert!(!constant_time_eq(b"Bearer correct-extra", b"Bearer correct"));
    }

    #[test]
    fn desktop_modes_transition_without_stale_market_lock_in() {
        assert_eq!(
            next_desktop_mode(DesktopMode::IdleDesktop, true, true),
            DesktopMode::MarketObserving
        );
        assert_eq!(
            next_desktop_mode(DesktopMode::MarketObserving, false, true),
            DesktopMode::LeaveMarket
        );
        assert_eq!(
            next_desktop_mode(DesktopMode::LeaveMarket, false, false),
            DesktopMode::IdleDesktop
        );
    }

    #[test]
    fn observation_bounds_must_be_finite_and_intersect_the_screen() {
        let now = now_ms();
        assert!(validate_observation(&observation(now), now).is_ok());
        let mut outside = observation(now);
        outside.environment.ui.chart = Some(ScreenRect {
            x: 2_000.0,
            y: 2_000.0,
            width: -1.0,
            height: 100.0,
        });
        assert_eq!(
            validate_observation(&outside, now),
            Err("invalid_viewport_bounds")
        );
    }

    #[test]
    fn config_round_trip_accepts_only_exact_extension_origins() {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("fly-config-{nonce}.json"));
        let config = BridgeConfig {
            paired_origin: "chrome-extension://abcdefghijklmnopabcdefghijklmnop".into(),
        };
        save_config(&path, &config).unwrap();
        assert_eq!(load_config(&path).unwrap(), config);
        fs::write(&path, br#"{"paired_origin":"https://example.com"}"#).unwrap();
        assert!(load_config(&path).is_err());
        let _ = fs::remove_file(path);
    }

    #[test]
    fn rejects_expired_and_unknown_order_fields() {
        let now = now_ms();
        let expired = observation(now - MAX_OBSERVATION_AGE_MS - 1_000);
        assert_eq!(
            validate_observation(&expired, now),
            Err("observation_expired")
        );
        let body = format!(
            r#"{{"kind":"market-environment","source":"demo","capturedAt":"{}","environment":{{"market":{{"momentum":0,"volatility":0,"volumeStrength":0.5}},"ui":{{}}}},"order":{{"side":"buy"}}}}"#,
            chrono::Utc::now().to_rfc3339()
        );
        assert!(serde_json::from_str::<ObservationRequest>(&body).is_err());
    }
}
