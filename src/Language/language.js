// 只有游戏开始后的语言涉及到这个脚本，一进游戏的脚本在index.html中

const FruitCuttingMaster = {
    en: {
      title: "Bubble Pop Kung Fu",
      start: "Start Game",
      back: "Back to Menu",
      gameOver: "Game Over!",
      finalScore: "Final Score",
      selectDifficulty: "Select Difficulty:",
      easy: "Easy",
      medium: "Medium",
      hard: "Hard",
      retry: "Retry",
      error: "Game start failed, please try again",
      calibrate: "Please maintain a standing position",
      score: "Score",
      lives: "Lives",
      balloons: "Balloons",
      remaining: "Remaining Repetitions",

    },
    zh: {
      title: "泡泡功夫",
      start: "开始游戏",
      back: "返回菜单",
      gameOver: "游戏结束！",
      finalScore: "最终得分",
      selectDifficulty: "选择难度：",
      easy: "简单",
      medium: "中等",
      hard: "困难",
      retry: "重试",
      error: "游戏启动失败，请重试",
      calibrate: "请保持站立姿势",
      score: "分数",
      lives: "生命值",
      balloons: "气球个数",
      remaining: "剩余次数",
    }
  }
  
  const currentLang = localStorage.getItem('language') || 'en'
  
  export function t(key) {
    return FruitCuttingMaster[currentLang]?.[key] || key
  }