# Local Learning (PersonalCalibration)

Paper observations stay on-device in IndexedDB. PersonalCalibration adjusts
behavior thresholds only:

- buyDrive / sellDrive thresholds
- proposal cooldown multiplier
- behavior confidence / sensory scale placeholders

**Local learning does not modify the MaleCNS connectome** (body IDs, topology,
or raw weights).

Default: learning **OFF**. Users opt in from the extension popup.

No cloud training, telemetry, or Supabase sync is enabled.
