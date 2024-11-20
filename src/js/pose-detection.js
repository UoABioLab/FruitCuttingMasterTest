// 修改导入方式
const Pose = window.Pose;  // 使用全局变量
const drawConnectors = window.drawConnectors;
const drawLandmarks = window.drawLandmarks;

export class PoseDetection {
    constructor() {
        // 初始化 MediaPipe Pose
        this.pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });
        // 设置配置
        this.pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
    }
    // 添加型加载方法
    async loadPoseModel() {
        return new Promise((resolve) => {
            this.pose.onResults((results) => {
                if (this.onResultsCallback) {
                    this.onResultsCallback(results);
                }
            });
            // 等待模型加载
            console.log('等待姿势检测模型加载...');
            setTimeout(resolve, 5000);
        });
    }
    async setupCamera() {
        let retryAttempts = 0;
        const maxRetries = 3;
        while (retryAttempts < maxRetries) {
            try {
                console.log(`摄像头初始化尝试 ${retryAttempts + 1}/${maxRetries}`);
                const video = document.getElementById('webcam');
                // 如果有现有的视频流，先停止它
                if (video.srcObject) {
                    const tracks = video.srcObject.getTracks();
                    tracks.forEach(track => track.stop());
                    video.srcObject = null;
                }
                // 等待一段时间让摄像头完全释放
                await new Promise(resolve => setTimeout(resolve, 1000));
                const constraints = {
                    video: {
                        width: 320,
                        height: 240,
                        frameRate: { ideal: 30 }
                    },
                    audio: false
                };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                video.srcObject = stream;
                video.style.display = 'block';
                await new Promise((resolve) => {
                    video.onloadedmetadata = () => {
                        video.play()
                            .then(resolve)
                            .catch(error => {
                                console.error('视频播放失败:', error);
                                throw error;
                            });
                    };
                });
                const camera = new Camera(video, {
                    onFrame: async () => {
                        try {
                            await this.pose.send({image: video});
                        } catch (error) {
                            console.error('Pose detection error:', error);
                        }
                    },
                    width: 320,
                    height: 240
                });
                await camera.start();
                console.log('摄像头初始化成功');
                return video;
            } catch (error) {
                retryAttempts++;
                console.error(`摄像头初始化失败 (尝试 ${retryAttempts}/${maxRetries}):`, error);
                if (retryAttempts === maxRetries) {
                    throw new Error('摄像头初始化失败，请尝试刷新页面或检查摄像头是否被其他程序占用');
                }
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    // 添加重新初始化姿势检测的方法
    async reinitializePose() {
        try {
            // 销毁现有实例
            await this.pose.close();
            // 重新创建实例
            this.pose = new Pose({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                }
            });
            // 重新设置选项
            this.pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            // 重新绑定结果回调
            this.pose.onResults((results) => {
                try {
                    if (this.onResultsCallback) {
                        this.onResultsCallback(results);
                    }
                } catch (error) {
                    console.error('姿势检测结果处理错误:', error);
                }
            });
        } catch (error) {
            console.error('重新初始化姿势检测失败:', error);
            throw error;
        }
    }
    // 修改手部检测方法，处理镜像问题
    checkHandsJoined(results) {
        if (!results.poseLandmarks) return false;
        const leftWrist = results.poseLandmarks[15];
        const rightWrist = results.poseLandmarks[16];
        const leftElbow = results.poseLandmarks[13];
        const rightElbow = results.poseLandmarks[14];
        if (leftWrist.visibility < 0.2 || rightWrist.visibility < 0.2) {
            return false;  // 如果看不清手腕，就认为手是分开的
        }
        // 计算手腕之间的距离
        const wristDistance = Math.hypot(
            -(leftWrist.x - rightWrist.x),
            leftWrist.y - rightWrist.y
        );
        // 计算肘部之间的距离作为参考
        const elbowDistance = Math.hypot(
            -(leftElbow.x - rightElbow.x),
            leftElbow.y - rightElbow.y
        );
        // 更严格的判断条件
        const isDistanceClose = wristDistance < (elbowDistance * 0.8);  // 降低阈值
        // 添加高度差判断
        const heightDifference = Math.abs(leftWrist.y - rightWrist.y);
        const isHeightSimilar = heightDifference < 0.1;  // 更严格的高度差要求
        return isDistanceClose && isHeightSimilar;
    }
    // 修改角度计算方法，处理镜像问题
    calculateKneeAngle(landmarks) {
        if (!landmarks) return 180;
        // 获取右侧髋关节、膝关节和脚踝的关键点
        const hip = landmarks[24];    // 右髋关节
        const knee = landmarks[26];   // 右膝关节
        const ankle = landmarks[28];  // 右脚踝
        // 降低可见度要求
        if (hip.visibility < 0.3 || knee.visibility < 0.3 || ankle.visibility < 0.3) {
            return 180;
        }
        // 计算向量，考虑镜像效果
        const vector1 = {
            x: Math.abs(hip.x - knee.x),  // 使用绝对值处理镜像
            y: hip.y - knee.y
        };
        const vector2 = {
            x: Math.abs(ankle.x - knee.x),  // 使用绝对值处理镜像
            y: ankle.y - knee.y
        };
        // 计算角度
        const dot = vector1.x * vector2.x + vector1.y * vector2.y;
        const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
        const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
        if (mag1 === 0 || mag2 === 0) return 180;
        const angle = Math.acos(dot / (mag1 * mag2)) * 180 / Math.PI;
        // 添加平滑处理，避免抖动
        if (!this.lastAngle) {
            this.lastAngle = angle;
        } else {
            // 使用简单的平滑处理
            const smoothFactor = 0.3;
            this.lastAngle = this.lastAngle * (1 - smoothFactor) + angle * smoothFactor;
        }
        return this.lastAngle;
    }
    // 修改深蹲检测方法，调整阈值
    checkSquat(results, difficulty) {
        if (!results.poseLandmarks) return false;
        const kneeAngle = this.calculateKneeAngle(results.poseLandmarks);
        // 调整角度阈值，大幅降低难度
        const angleThresholds = {
            'easy': 165,     // 几乎是站立姿势就能触发
            'medium': 150,   // 轻微下蹲就能触发
            'hard': 135      // 中等下蹲就能触发
        };
        const threshold = angleThresholds[difficulty] || 165;
        // 添加平滑处理
        if (!this.lastSquatState) {
            this.lastSquatState = kneeAngle <= threshold;
        } else {
            // 使用状态持续判断
            const newState = kneeAngle <= threshold;
            if (newState !== this.lastSquatState) {
                if (!this.squatStateCount) this.squatStateCount = 0;
                this.squatStateCount++;
                if (this.squatStateCount >= 3) {
                    this.lastSquatState = newState;
                    this.squatStateCount = 0;
                }
            } else {
                this.squatStateCount = 0;
            }
        }
        return this.lastSquatState;
    }
    // 修改骨骼绘制方法，移除翻转
    drawSkeleton(ctx, results, width, height) {
        if (!results.poseLandmarks) return;
        ctx.clearRect(0, 0, width, height);
        // 绘制连接线
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.lineWidth = 3;
        for (const connection of POSE_CONNECTIONS) {
            const start = results.poseLandmarks[connection[0]];
            const end = results.poseLandmarks[connection[1]];
            if (start.visibility > 0.5 && end.visibility > 0.5) {
                ctx.beginPath();
                ctx.moveTo(start.x * width, start.y * height);
                ctx.lineTo(end.x * width, end.y * height);
                ctx.stroke();
            }
        }
        // 绘制关键点
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        results.poseLandmarks.forEach(landmark => {
            if (landmark.visibility > 0.5) {
                ctx.beginPath();
                ctx.arc(landmark.x * width, landmark.y * height, 5, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
    }
}
