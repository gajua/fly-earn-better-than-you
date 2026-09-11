# MaleCNS Subgraph Selection

Generated from the official `male-cns:v1.0` neuPrint snapshot. Every listed body ID was returned by the source query.

Source query strategy: Traced vnc_sensory|sensory_ascending -> ascending_neuron -> cb_intrinsic -> descending_neuron; top weighted populations capped at 48/64/96/48; retained induced edges.

Source query pattern (executed with concrete verified IDs at each layer):

```cypher
MATCH (source:Neuron)-[edge:ConnectsTo]->(target:Neuron)
WHERE source.status = 'Traced' AND target.status = 'Traced'
  AND source.superclass IN $verifiedSourceSuperclasses
  AND target.superclass = $verifiedTargetSuperclass
  AND edge.weight >= $minimumPathWeight
RETURN source.bodyId, target.bodyId, edge.weight
ORDER BY edge.weight DESC
```

## sensory-input

- Number of neurons: 48
- Actual superclass annotation: `sensory_ascending, vnc_sensory`
- Actual body IDs: 45591, 46750, 48512, 53005, 54436, 62196, 63911, 65252, 800049, 801379, 801957, 802125, 802282, 803140, 803882, 803886, 803903, 804104, 804120, 804151, 804256, 804528, 805000, 805314, 805347, 805493, 805534, 805586, 805587, 805594, 805623, 806067, 806078, 806261, 806385, 806527, 809986, 902929, 902991, 905002, 905074, 905881, 906190, 906292, 906449, 906519, 908138, 936625
- Limitation: population role and market-channel assignment are experimental project abstractions.

## ascending

- Number of neurons: 62
- Actual superclass annotation: `ascending_neuron`
- Actual body IDs: 10592, 10922, 11604, 12868, 13181, 13381, 14026, 14994, 15443, 15751, 15884, 15906, 16384, 16510, 16569, 17628, 18050, 18325, 19197, 19411, 19419, 19709, 20065, 21195, 22728, 23382, 23566, 23826, 24050, 24246, 25047, 26284, 29334, 29643, 29665, 32085, 32930, 37979, 41594, 51597, 56710, 80727, 162471, 511867, 512059, 512119, 512555, 513169, 514484, 515447, 515767, 516615, 517005, 520116, 521152, 522310, 522822, 523539, 558778, 801206, 808335, 910030
- Limitation: population role and market-channel assignment are experimental project abstractions.

## path-intermediate

- Number of neurons: 91
- Actual superclass annotation: `cb_intrinsic`
- Actual body IDs: 10094, 10128, 10136, 10147, 10202, 10263, 10297, 10323, 10489, 10490, 10609, 10635, 10637, 10646, 10684, 10707, 10828, 10855, 10867, 10916, 10941, 10943, 10995, 11023, 11156, 11191, 11272, 11357, 11413, 11415, 11472, 11496, 11518, 11542, 11833, 11898, 11954, 12123, 12167, 12192, 12402, 12497, 12507, 12529, 12725, 12784, 12924, 13004, 13035, 13078, 13242, 13281, 13436, 13584, 13794, 14042, 14112, 14134, 14518, 14861, 15376, 15500, 15775, 15785, 15812, 18090, 26283, 29367, 29988, 53967, 65991, 512690, 512911, 513636, 516980, 519387, 519415, 519420, 520194, 520621, 520792, 520862, 522857, 524224, 524363, 529031, 531583, 531643, 534038, 534040, 555383
- Limitation: population role and market-channel assignment are experimental project abstractions.

## descending-output

- Number of neurons: 48
- Actual superclass annotation: `descending_neuron`
- Actual body IDs: 10001, 10010, 10091, 10117, 10124, 10131, 10141, 10177, 10192, 10197, 10228, 10234, 10244, 10274, 10281, 10283, 10286, 10301, 10361, 10417, 10440, 10558, 10577, 10584, 10856, 10923, 10957, 10968, 11006, 11065, 11078, 11088, 11159, 11380, 11693, 11931, 12089, 12490, 12628, 13130, 20418, 33037, 256420, 519410, 519771, 520300, 555457, 800099
- Limitation: population role and market-channel assignment are experimental project abstractions.
