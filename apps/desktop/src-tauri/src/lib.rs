mod bridge;

use bridge::{BridgeRuntime, BridgeStatus, PairingDetails};
use std::sync::Arc;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Position, Size, State,
    WindowEvent,
};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenBounds {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    scale_factor: f64,
}

#[tauri::command]
fn bridge_status(bridge: State<'_, Arc<BridgeRuntime>>) -> BridgeStatus {
    bridge.status()
}

#[tauri::command]
fn pair_extension(
    extension_id: String,
    bridge: State<'_, Arc<BridgeRuntime>>,
) -> Result<PairingDetails, String> {
    bridge.pair_extension(&extension_id)
}

#[tauri::command]
fn screen_bounds(app: AppHandle) -> Result<ScreenBounds, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "overlay window unavailable".to_string())?;
    let monitor = window
        .primary_monitor()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "primary monitor unavailable".to_string())?;
    let position = monitor.position();
    let size = monitor.size();
    Ok(ScreenBounds {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        scale_factor: monitor.scale_factor(),
    })
}

fn show_window(app: &AppHandle, label: &str, focus: bool) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.show();
        if focus {
            let _ = window.set_focus();
        }
    }
}

fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_fly = MenuItemBuilder::with_id("show-fly", "Show Fly").build(app)?;
    let hide_fly = MenuItemBuilder::with_id("hide-fly", "Hide Fly").build(app)?;
    let brain_status = MenuItemBuilder::with_id("brain-status", "Brain Status").build(app)?;
    let developer =
        MenuItemBuilder::with_id("developer-panel", "Developer Panel").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
    let menu = MenuBuilder::new(app)
        .items(&[&show_fly, &hide_fly, &brain_status, &developer, &quit])
        .build()?;

    let mut tray = TrayIconBuilder::new()
        .tooltip("Fly observation overlay")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show-fly" => show_window(app, "main", false),
            "hide-fly" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "brain-status" => {
                show_window(app, "developer", true);
                let _ = app.emit_to("developer", "brain-status-requested", ());
            }
            "developer-panel" => show_window(app, "developer", true),
            "quit" => app.exit(0),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

fn configure_overlay(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let window = app
        .get_webview_window("main")
        .ok_or("overlay window unavailable")?;
    let monitor = window.primary_monitor()?.ok_or("primary monitor unavailable")?;
    let monitor_position = PhysicalPosition::new(monitor.position().x, monitor.position().y);
    let monitor_size = PhysicalSize::new(monitor.size().width, monitor.size().height);

    window.set_position(Position::Physical(monitor_position))?;
    window.set_size(Size::Physical(monitor_size))?;
    window.set_always_on_top(true)?;
    window.set_ignore_cursor_events(true)?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            configure_overlay(app.handle())?;
            create_tray(app.handle())?;

            let config_path = app.path().app_config_dir()?.join("bridge.json");
            let bridge = BridgeRuntime::start(app.handle().clone(), config_path)
                .map_err(std::io::Error::other)?;
            app.manage(bridge);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            bridge_status,
            pair_extension,
            screen_bounds
        ])
        .run(tauri::generate_context!())
        .expect("error while running Fly desktop");
}
