# Generic Broker Detector foundation

Known brokers still use dedicated adapters (Binance / Upbit).

Unknown pages can run a DOM semantic GenericBrokerDetector:

```text
Known broker → BrokerAdapter
Unknown broker → GenericBrokerDetector → confidence → Paper-only
```

v1.1 detector uses role / aria / visible text / size heuristics only.
No deep learning and no hosted LLM.

Safety:

- Paper only
- Live Assist disabled for generic detections
- Low confidence → unsupported

Optional user feedback (`BrokerDetectionFeedback`) is stored locally for a
future on-device model path. Training is not implemented in v1.1.
