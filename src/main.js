import './style.css'
import { Game } from './js/game'

document.addEventListener('DOMContentLoaded', async () => {
    // 创建游戏实例
    const game = new Game();
    
    // 页面加载时就初始化摄像头和姿势检测
    try {
        await game.initializePoseDetection();
        console.log('姿势检测初始化成功');
    } catch (error) {
        console.error('姿势检测初始化失败:', error);
        alert('摄像头初始化失败，请确保允许使用摄像头并刷新页面');
    }
    
    // 添加开始游戏按钮事件监听
    document.getElementById('startButton').addEventListener('click', () => {
        const playerID = document.getElementById('playerID').value;
        const difficulty = document.getElementById('difficultySelect').value;
        
        if (playerID && difficulty) {
            game.start(playerID, difficulty);
        } else {
            alert('请输入ID并选择难度');
        }
    });

    // 修改退出按钮跳转地址
    document.getElementById('exitButton').addEventListener('click', () => {
        window.location.href = 'https://uoabiolab.github.io/GameIndex/';
    });
});
