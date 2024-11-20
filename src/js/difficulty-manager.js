export class DifficultySettings {
    constructor(fruitInitialSpeed, spawnPositionRatio, intervalTime, gravity, scoreThreshold, squatRatio) {
        this.fruitInitialSpeed = fruitInitialSpeed;
        this.spawnPositionRatio = spawnPositionRatio;
        this.intervalTime = intervalTime;
        this.gravity = gravity;
        this.scoreThreshold = scoreThreshold;
        this.squatRatio = squatRatio;
    }
    calculateSpawnPosition(screenWidth) {
        return Math.floor(screenWidth * this.spawnPositionRatio);
    }
}
// 调整难度参数
export const DIFFICULTY_SETTINGS = {
    easy: new DifficultySettings(
        6,      // 初始速度从8降到6
        0.15,   // 生成范围保持不变
        2.0,    // 间隔时间保持不变
        0.05,   // 重力从0.08降到0.05
        8,      // 目标分数保持不变
        0.9     // 下蹲判定保持不变
    ),
    medium: new DifficultySettings(
        7,      // 初始速度从10降到7
        0.2,    // 生成范围保持不变
        1.5,    // 间隔时间保持不变
        0.06,   // 重力从0.12降到0.06
        10,     // 目标分数保持不变
        0.8     // 下蹲判定保持不变
    ),
    hard: new DifficultySettings(
        8,      // 初始速度从12降到8
        0.25,   // 生成范围保持不变
        1.2,    // 间隔时间保持不变
        0.07,   // 重力从0.15降到0.07
        12,     // 目标分数保持不变
        0.7     // 下蹲判定保持不变
    )
}; 
