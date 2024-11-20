import { DifficultySettings, DIFFICULTY_SETTINGS } from './difficulty-manager'
import { PoseDetection } from './pose-detection'
import { Fruit } from './fruit'
export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.poseCanvas = document.getElementById('poseCanvas');
        this.poseCtx = this.poseCanvas.getContext('2d');
        this.score = 0;
        this.life = 3;
        this.fruits = [];
        this.lastFruitTime = 0;
        this.gameOver = false;
        this.numberToComplete = 0;
        this.poseDetection = new PoseDetection();
        this.settings = null;
        this.baselineDistance = null;
        this.poseDetectionInitialized = false;
        this.setupEventListeners();
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
        this.resizeCanvas();
    }
    async initializePoseDetection() {
        try {
            // 初始化摄像头和姿势检测
            const video = await this.poseDetection.setupCamera();
            this.poseDetection.pose.onResults((results) => {
                this.poseResults = results;
            });
            this.poseDetectionInitialized = true;
            // 初始时隐藏视频和姿势检测画布
            document.getElementById('webcam').style.display = 'none';
            document.getElementById('poseCanvas').style.display = 'none';
        } catch (error) {
            console.error('姿势检测初始化失败:', error);
            alert(error.message || '摄像头初始化失败，请确保允许使用摄像头并关闭其他使用摄像头的应用');
            throw error;
        }
    }
    async start(playerId, difficulty) {
        this.playerId = playerId;
        this.difficulty = difficulty;
        this.settings = DIFFICULTY_SETTINGS[difficulty];
        this.numberToComplete = this.settings.scoreThreshold;
        document.getElementById('difficultyScreen').classList.add('hidden');
        document.getElementById('gameScreen').classList.remove('hidden');
        this.resizeCanvas();
        try {
            this.showLoadingMessage("Initializing game...");
            await this.loadResources();
            document.getElementById('webcam').style.display = 'block';
            document.getElementById('poseCanvas').style.display = 'block';
            this.hideLoadingMessage();
            await this.showCountdown();
            await this.calibrate();  // 添加校准阶段
            this.gameLoop();
        } catch (error) {
            console.error('游戏启动失败:', error);
            await this.showErrorDialog(error.message);
        }
    }
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.poseCanvas.width = 250;
        this.poseCanvas.height = 187.5;
        if (!this.gameOver) {
            this.fruits.forEach(fruit => {
                fruit.x = Math.min(Math.max(fruit.x, 0), this.canvas.width);
                fruit.y = Math.min(Math.max(fruit.y, 0), this.canvas.height);
            });
        }
    }
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        document.getElementById('restartButton').addEventListener('click', () => this.restart());
        document.getElementById('homeButton').addEventListener('click', () => this.returnToHome());
    }
    async restart() {
        // 重置游戏状态
        this.score = 0;
        this.life = 3;
        this.fruits = [];
        this.lastFruitTime = 0;
        this.gameOver = false;
        this.numberToComplete = this.settings.scoreThreshold;
        // 隐藏游戏结束界面
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('gameScreen').classList.remove('hidden');
        try {
            this.showLoadingMessage("Preparing new game...");
            document.getElementById('webcam').style.display = 'block';
            document.getElementById('poseCanvas').style.display = 'block';
            this.hideLoadingMessage();
            await this.showCountdown();
            await this.calibrate();  // 添加校准阶段
            this.gameLoop();
        } catch (error) {
            console.error('重新开始游戏失败:', error);
            await this.showErrorDialog(error.message);
        }
    }
    gameLoop() {
        if (this.gameOver) return;
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // 更新和绘制游戏对象
        this.updateGameObjects();
        this.drawGameObjects();
        // 更新UI
        this.updateUI();
        // 继续游戏循环
        requestAnimationFrame(() => this.gameLoop());
    }
    updateGameObjects() {
        const currentTime = Date.now() / 1000; // 转换为秒
        // 生成新水果
        if (this.fruits.length === 0 && currentTime - this.lastFruitTime > this.settings.intervalTime) {
            const noseX = this.getNosePosition();
            const spawnPosition = this.settings.calculateSpawnPosition(this.canvas.width);
            this.fruits.push(new Fruit(
                noseX,
                spawnPosition,
                this.canvas.height,
                this.images.fruits,
                this.settings.fruitInitialSpeed,
                this.settings.gravity
            ));
            this.lastFruitTime = currentTime;
        }
        // 新水果位置和检查碰撞
        this.checkCollisionsAndUpdateFruits();
    }
    checkCollisionsAndUpdateFruits() {
        const toRemove = [];
        for (const fruit of this.fruits) {
            if (!fruit.update()) {
                toRemove.push(fruit);
                this.life--;
                this.sounds.fail.play();
                continue;
            }
            if (this.poseResults && this.poseResults.poseLandmarks) {
                const handsJoined = this.poseDetection.checkHandsJoined(this.poseResults);
                const isSquatting = this.poseDetection.checkSquat(
                    this.poseResults,
                    this.difficulty
                );
                if (handsJoined && isSquatting) {
                    const landmarks = this.poseResults.poseLandmarks;
                    const leftWrist = landmarks[15];
                    const rightWrist = landmarks[16];
                    // 修改坐标计算，翻转 x 坐标
                    const leftX = (1 - leftWrist.x) * this.canvas.width;  // 翻转 x 坐标
                    const rightX = (1 - rightWrist.x) * this.canvas.width;  // 翻转 x 坐标
                    const leftY = leftWrist.y * this.canvas.height;
                    const rightY = rightWrist.y * this.canvas.height;
                    // 打印手的位置
                    console.log('手的位置:', {
                        left: { x: leftX, y: leftY },
                        right: { x: rightX, y: rightY }
                    });
                    // 打印水果的位置
                    console.log('水果的位置:', {
                        x: fruit.x,
                        y: fruit.y
                    });
                    if (fruit.checkCollision(leftX, leftY) || 
                        fruit.checkCollision(rightX, rightY)) {
                        toRemove.push(fruit);
                        this.score++;
                        this.numberToComplete--;
                        this.sounds.succeed.play();
                    }
                }
            }
        }
        // 移除需要删除的水果
        this.fruits = this.fruits.filter(fruit => !toRemove.includes(fruit));
        // 检查游戏结条件
        if (this.life <= 0 || this.numberToComplete <= 0) {
            this.gameOver = true;
            this.showGameOver();
        }
    }
    drawGameObjects() {
        // 绘制水果
        this.fruits.forEach(fruit => fruit.draw(this.ctx));
        // 绘制姿势反馈
        if (this.poseResults && this.poseResults.poseLandmarks) {
            this.drawPoseFeedback();
        }
        // 在小窗口中绘制姿势检测结果
        this.drawPoseDetection();
    }
    updateUI() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
        document.getElementById('life').textContent = `Lives: ${this.life}`;
        document.getElementById('toComplete').textContent = `Remaining: ${this.numberToComplete}`;
    }
    showGameOver() {
        document.getElementById('gameScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.remove('hidden');
        document.getElementById('finalScore').textContent = `Final Score: ${this.score}`;
    }
    getNosePosition() {
        if (this.poseResults && this.poseResults.poseLandmarks) {
            const nose = this.poseResults.poseLandmarks[0];
            // 翻转 x 坐标
            return nose.x * this.canvas.width;  // 移除翻转
        }
        return this.canvas.width / 2;
    }
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    }
    async loadResources() {
        try {
            // 加载图片资源
            this.images = {
                background: await this.loadImage('/resources/images/background1.jpg'),
                fruits: await Promise.all([
                    this.loadImage('/resources/images/fruits/apple.png'),
                    this.loadImage('/resources/images/fruits/orange.png'),
                    this.loadImage('/resources/images/fruits/pineapple.png'),
                    this.loadImage('/resources/images/fruits/strawberry.png')
                ]),
                poses: {
                    handsJoined: await this.loadImage('/resources/images/poses/hands-joined.png'),
                    prayingHands: await this.loadImage('/resources/images/poses/praying-hands.png'),
                    squat: await this.loadImage('/resources/images/poses/squat.png')
                }
            };
            // 加载音效
            this.sounds = {
                succeed: new Audio('/resources/sounds/succeed.mp3'),
                fail: new Audio('/resources/sounds/fail.mp3'),
                background: new Audio('/resources/sounds/background.mp3')
            };
            // 设置背景音乐循环播放
            this.sounds.background.loop = true;
            await this.sounds.background.play().catch(err => {
                console.warn('无法自动播放背景音乐:', err);
            });
        } catch (error) {
            console.error('资源加载失败:', error);
            throw error;
        }
    }
    drawPoseFeedback() {
        const landmarks = this.poseResults.poseLandmarks;
        // 检查手部状态
        const handsJoined = this.poseDetection.checkHandsJoined(this.poseResults);
        if (handsJoined) {
            const leftWrist = landmarks[15];
            const rightWrist = landmarks[16];
            const centerX = (1 - (leftWrist.x + rightWrist.x) / 2) * this.canvas.width;
            const centerY = (leftWrist.y + rightWrist.y) / 2 * this.canvas.height;
            // 增大图片尺寸从80x80到160x160
            this.ctx.drawImage(
                this.images.poses.handsJoined,
                centerX - 80,  // 中心点偏移量增加到80
                centerY - 80,  // 中心点偏移量增加到80
                160,          // 宽度增加到160
                160           // 高度增加到160
            );
        } else {
            this.showFeedback('left', 'Please Join Hands');
        }
        
        // 检查下蹲态
        const isSquatting = this.poseDetection.checkSquat(
            this.poseResults,
            this.difficulty
        );
        if (!isSquatting) {
            this.showFeedback('right', 'Please Squat');
        }
    }
    drawPoseDetection() {
        if (!this.poseResults || !this.poseResults.poseLandmarks) return;
        // 清空姿势检测画布
        this.poseCtx.clearRect(0, 0, this.poseCanvas.width, this.poseCanvas.height);
        // 绘制骨骼
        this.poseDetection.drawSkeleton(
            this.poseCtx,
            this.poseResults,
            this.poseCanvas.width,
            this.poseCanvas.height
        );
    }
    showFeedback(direction, text) {
        const x = direction === 'left' ? 
            this.canvas.width * 0.75 : 
            this.canvas.width * 0.25;
        const y = this.canvas.height * 0.33;
        
        // 绘制图标，尺寸增加到160x160
        const image = direction === 'left' ? 
            this.images.poses.prayingHands : 
            this.images.poses.squat;
        this.ctx.drawImage(
            image, 
            x - 80,   // 中心点偏移量增加到80
            y - 80,   // 中心点偏移量增加到80
            160,      // 宽度增加到160
            160       // 高度增加到160
        );
        
        // 相应调整文字位置
        this.ctx.font = '30px Comic Sans MS';
        this.ctx.fillStyle = 'red';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            direction === 'left' ? 'Join Hands' : 'Squat Down', 
            x, 
            y + 100  // 增加文字偏移量，以适应更大的图片
        );
    }
    // 修改校准方法
    async calibrate() {
        // 显示校准倒计时
        for (let i = 3; i > 0; i--) {
            // 只清空画布，不绘制背景
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            // 绘制校准文本
            this.ctx.font = '48px Comic Sans MS';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Calibration: ${i}`, this.canvas.width/2, this.canvas.height/2);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // 获取校准姿势的基准距离
        if (this.poseResults && this.poseResults.poseLandmarks) {
            const landmarks = this.poseResults.poseLandmarks;
            const shoulders = {
                x: (landmarks[11].x + landmarks[12].x) / 2,
                y: (landmarks[11].y + landmarks[12].y) / 2
            };
            const ankles = {
                x: (landmarks[27].x + landmarks[28].x) / 2,
                y: (landmarks[27].y + landmarks[28].y) / 2
            };
            this.baselineDistance = Math.hypot(
                ankles.x - shoulders.x,
                ankles.y - shoulders.y
            ) * 100;
            console.log('Calibration completed, baseline distance:', this.baselineDistance);
        } else {
            console.warn('No pose detected, using default baseline distance');
            this.baselineDistance = 50;
        }
    }
    // 修改倒计时方法
    async showCountdown() {
        // 创建倒计时元素
        const countdownDiv = document.createElement('div');
        countdownDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 100px;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            z-index: 1000;
        `;
        document.body.appendChild(countdownDiv);
        // 5秒倒计时
        for (let i = 5; i > 0; i--) {
            countdownDiv.textContent = i;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // 显示 "START!"
        countdownDiv.textContent = "START!";
        await new Promise(resolve => setTimeout(resolve, 1000));
        // 移除倒计时元素
        countdownDiv.remove();
    }
    // 添加加载提示方法
    showLoadingMessage(message) {
        let loadingDiv = document.getElementById('loadingMessage');
        if (!loadingDiv) {
            loadingDiv = document.createElement('div');
            loadingDiv.id = 'loadingMessage';
            loadingDiv.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 24px;
                color: white;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                z-index: 1000;
                background-color: rgba(0, 0, 0, 0.7);
                padding: 20px;
                border-radius: 10px;
            `;
            document.body.appendChild(loadingDiv);
        }
        loadingDiv.textContent = message;
    }
    // 添加隐藏加载提示方法
    hideLoadingMessage() {
        const loadingDiv = document.getElementById('loadingMessage');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
    // 显示重试对话框
    showRetryDialog() {
        return new Promise((resolve) => {
            const dialogDiv = document.createElement('div');
            dialogDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                padding: 20px;
                border-radius: 10px;
                color: white;
                text-align: center;
                z-index: 1001;
            `;
            dialogDiv.innerHTML = `
                <h3>No Person Detected</h3>
                <p>Please ensure:</p>
                <ul style="text-align: left;">
                    <li>You are in front of the camera</li>
                    <li>Camera is properly connected</li>
                    <li>Lighting is adequate</li>
                </ul>
                <button onclick="this.parentElement.dataset.action='retry'" style="margin: 10px;">Retry</button>
                <button onclick="this.parentElement.dataset.action='cancel'" style="margin: 10px;">Back to Menu</button>
            `;
            document.body.appendChild(dialogDiv);
            dialogDiv.addEventListener('click', (e) => {
                if (dialogDiv.dataset.action) {
                    const action = dialogDiv.dataset.action;
                    dialogDiv.remove();
                    resolve(action === 'retry');
                }
            });
        });
    }
    // 显示错误对话框
    async showErrorDialog(message) {
        const result = await this.showRetryDialog();
        if (result) {
            // 用户选择重试
            await this.start(this.playerId, this.settings);
        } else {
            // 用户选择返回主菜单
            this.returnToMainMenu();
        }
    }
    // 返回主菜单
    returnToMainMenu() {
        // 清理游戏状态
        this.gameOver = true;
        this.hideLoadingMessage();
        // 显示主菜单
        document.getElementById('gameScreen').classList.add('hidden');
        document.getElementById('difficultyScreen').classList.remove('hidden');
    }
    // 添加返回主页的方法
    returnToHome() {
        // 重置游戏状态
        this.score = 0;
        this.life = 3;
        this.fruits = [];
        this.lastFruitTime = 0;
        this.gameOver = false;
        this.numberToComplete = 0;
        // 隐藏游戏结束界面
        document.getElementById('gameOverScreen').classList.add('hidden');
        // 隐藏游戏界面
        document.getElementById('gameScreen').classList.add('hidden');
        // 隐藏摄像头和姿势检测画布
        document.getElementById('webcam').style.display = 'none';
        document.getElementById('poseCanvas').style.display = 'none';
        // 显示难度选择界面
        document.getElementById('difficultyScreen').classList.remove('hidden');
        // 清空玩家ID输入框
        document.getElementById('playerID').value = '';
        // 重置难度选择
        document.getElementById('difficultySelect').value = '';
    }
} 
