# Agent Rules

These rules apply to every human or AI change in this repository.

1. Prioritize simulation and observation over real order functionality.
2. Never couple broker-specific parsing to Fly Brain logic.
3. `MockFlyBrain` and future `MaleCNSBrain` implementations use the same
   `FlyBrain` interface.
4. Overlay UI must not interfere with click, scroll, keyboard, or input behavior
   of the host website. Keep it non-interactive.
5. Never read or persist passwords, OTPs, cookies, session tokens, account
   passwords, authentication data, or real order requests.
6. Never call `click()`, dispatch trading events, submit order forms, or automate
   an order.
7. When claiming MaleCNS use, document exactly which dataset, neurons,
   connections, transformations, and simulation stages are actually active.
8. Always label heuristic behavior as heuristic and biological simulation as
   biological simulation. Do not blur the distinction.
9. Keep `MarketEnvironment` serializable and broker-neutral.
10. Validate lint, typecheck, tests, and build before considering work complete.
