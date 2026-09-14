# Local / experimental PersonalCalibration

Product default is **GlobalCalibrationPreset** (same for all users). See
[`GLOBAL_LEARNING.md`](GLOBAL_LEARNING.md).

PersonalCalibration remains in code as a **developer / experimental** path only.
It is **not** enabled in the product UI by default and must not create
user-quality divergence for normal users.

If enabled experimentally:

- Paper observations stay on-device in IndexedDB
- Adjusts thresholds / cooldown only
- **Does not modify the MaleCNS connectome**
