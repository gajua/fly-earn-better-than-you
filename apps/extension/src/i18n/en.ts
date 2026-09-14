export type MessageKey =
  | "status.loading"
  | "status.wake"
  | "status.saved"
  | "status.historyCleared"
  | "status.learningReset"
  | "status.dataReset"
  | "bubble.login"
  | "bubble.marketUnavailable"
  | "bubble.brainUnavailable"
  | "bubble.approachBuy"
  | "bubble.approachSell"
  | "bubble.scanAssets"
  | "bubble.observeChart"
  | "bubble.explore"
  | "bubble.panic"
  | "popup.mode"
  | "popup.trading"
  | "popup.brain"
  | "popup.maxCapital"
  | "popup.startingCapital"
  | "popup.save"
  | "popup.language"
  | "popup.languageAuto"
  | "popup.languageKo"
  | "popup.languageEn"
  | "popup.learning"
  | "popup.learningEnable"
  | "popup.learningSamples"
  | "popup.buyThreshold"
  | "popup.sellThreshold"
  | "popup.resetLearning"
  | "popup.learningPrivacy"
  | "popup.globalLearning"
  | "popup.contributeLearning"
  | "popup.contributePrivacy"
  | "popup.presetVersion"
  | "popup.queuedObservations"
  | "popup.lastSync"
  | "popup.clearQueue"
  | "popup.syncLearning"
  | "popup.rollbackPreset"
  | "popup.sameQuality"
  | "popup.performance"
  | "popup.experimentalPerformance"
  | "popup.rangeAll"
  | "popup.range7d"
  | "popup.range30d"
  | "popup.byBrainMode"
  | "popup.diagnostics"
  | "popup.privacy"
  | "popup.privacyBody"
  | "popup.clearPaper"
  | "popup.resetAll"
  | "popup.fineprint"
  | "perf.totalReturn"
  | "perf.realizedPnl"
  | "perf.trades"
  | "perf.winRate"
  | "perf.avgWin"
  | "perf.avgLoss"
  | "perf.profitFactor"
  | "perf.maxDrawdown"
  | "perf.bestTrade"
  | "perf.worstTrade"
  | "confirm.resetLearning"
  | "confirm.clearPaper"
  | "confirm.resetAll";

export type MessageDictionary = Record<MessageKey, string>;

export const en: MessageDictionary = {
  "status.loading": "Checking status…",
  "status.wake": "Open a broker tab to wake the fly.",
  "status.saved": "Settings saved.",
  "status.historyCleared": "Paper history cleared.",
  "status.learningReset": "Learning reset.",
  "status.dataReset": "All local Fly data cleared.",
  "bubble.login": "Log in to see portfolio too.",
  "bubble.marketUnavailable": "Market data unavailable — resting.",
  "bubble.brainUnavailable": "MaleCNS disconnected — resting.",
  "bubble.approachBuy": "Drawn toward the buy area.",
  "bubble.approachSell": "Hovering near the sell area.",
  "bubble.scanAssets": "Scanning the market list.",
  "bubble.observeChart": "Watching the chart quietly.",
  "bubble.explore": "Wandering around the page.",
  "bubble.panic": "Volatility spiked — scurrying away.",
  "popup.mode": "Mode",
  "popup.trading": "Trading",
  "popup.brain": "Brain",
  "popup.maxCapital": "Max trading capital",
  "popup.startingCapital": "Starting paper capital",
  "popup.save": "Save settings",
  "popup.language": "Language",
  "popup.languageAuto": "Auto",
  "popup.languageKo": "한국어",
  "popup.languageEn": "English",
  "popup.learning": "Learning",
  "popup.learningEnable": "Learn from my Paper trading history",
  "popup.learningSamples": "Learning samples",
  "popup.buyThreshold": "Buy threshold",
  "popup.sellThreshold": "Sell threshold",
  "popup.resetLearning": "Reset learning",
  "popup.learningPrivacy":
    "Learning runs locally on this device. Your trading observations are not uploaded.",
  "popup.globalLearning": "Global Learning",
  "popup.contributeLearning":
    "Contribute anonymous Paper-trading learning data",
  "popup.contributePrivacy":
    "Your data helps improve the same global calibration used by all Fly users. No broker credentials or account information are uploaded.",
  "popup.presetVersion": "Preset",
  "popup.queuedObservations": "Queued observations",
  "popup.lastSync": "Last sync",
  "popup.clearQueue": "Clear contribution queue",
  "popup.syncLearning": "Sync now",
  "popup.rollbackPreset": "Rollback to bundled preset",
  "popup.sameQuality":
    "All users on the same Fly version and GlobalCalibrationPreset start with the same calibration behavior.",
  "popup.performance": "Fly Performance",
  "popup.experimentalPerformance": "Experimental paper performance",
  "popup.rangeAll": "All",
  "popup.range7d": "7D",
  "popup.range30d": "30D",
  "popup.byBrainMode": "By brain mode",
  "popup.diagnostics": "Selector / page diagnostics",
  "popup.privacy": "Privacy",
  "popup.privacyBody":
    "Passwords, OTPs, cookies, and session tokens are never read or stored.",
  "popup.clearPaper": "Clear Paper history",
  "popup.resetAll": "Reset all local Fly data",
  "popup.fineprint":
    "Approaching BUY ≠ predicting profit. Experimental MaleCNS-constrained neural response only. Historical paper results do not imply future performance.",
  "perf.totalReturn": "Total Return",
  "perf.realizedPnl": "Realized P&L",
  "perf.trades": "Trades",
  "perf.winRate": "Win Rate",
  "perf.avgWin": "Avg Win",
  "perf.avgLoss": "Avg Loss",
  "perf.profitFactor": "Profit Factor",
  "perf.maxDrawdown": "Max Drawdown",
  "perf.bestTrade": "Best Trade",
  "perf.worstTrade": "Worst Trade",
  "confirm.resetLearning":
    "Reset local learning observations and calibration? Paper history stays.",
  "confirm.clearPaper": "Clear Paper trades and cycles?",
  "confirm.resetAll":
    "Reset ALL local Fly data (learning, paper, preferences defaults)?",
};
