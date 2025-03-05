class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;

        this.score = 0;
        this.size = 1;
        this.particles = new ParticleSystem(this.canvas, this.ctx);
        this.mutationPoints = 0;
        this.lastMutationSize = 1;
        this.powerUps = [];

        // Send score updates to Telegram periodically
        this.lastScoreSent = 0;

        this.creature = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            size: 20,
            speed: 5,
            segments: [{x: 0, y: 0}],
            angle: 0,
            mutations: {
                speed: 0,
                defense: 0,
                attack: 0
            },
            color: '0, 255, 0',
            effects: {
                speedBoost: 0,
                defenseBoost: 0,
                trail: []
            },
            glow: 0
        };

        this.foodTypes = [
            { type: 'normal', color: '0, 255, 0', chance: 0.7, points: 10, effectType: 'none' },
            { type: 'speed', color: '255, 0, 0', chance: 0.1, points: 15, effectType: 'orbit' },
            { type: 'defense', color: '0, 0, 255', chance: 0.1, points: 15, effectType: 'orbit' },
            { type: 'bonus', color: '255, 255, 0', chance: 0.1, points: 30, effectType: 'pulse' }
        ];

        this.food = [];
        this.enemies = [];
        this.keys = {};
        this.showMutationUI = false;

        this.visualEffects = {
            orbitAngle: 0,
            pulseSize: 0,
            pulseDirection: 1
        };

        this.setupEventListeners();
        this.spawnFood();
        this.spawnEnemy();
        this.gameLoop();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === 'm' && this.mutationPoints > 0) {
                this.showMutationUI = !this.showMutationUI;
                this.drawMutationUI();
            }
        });
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);

        // Add click listener for mutation buttons
        this.canvas.addEventListener('click', (e) => {
            if (this.showMutationUI && this.mutationPoints > 0) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                this.handleMutationClick(x, y);
            }
        });
    }

    handleMutationClick(x, y) {
        const buttonWidth = 150;
        const buttonHeight = 40;
        const startX = (this.canvas.width - buttonWidth) / 2;
        const startY = this.canvas.height / 2 - 60;

        // Check each mutation button
        const buttons = [
            { type: 'speed', y: startY },
            { type: 'defense', y: startY + 50 },
            { type: 'attack', y: startY + 100 }
        ];

        for (const button of buttons) {
            if (x >= startX && x <= startX + buttonWidth &&
                y >= button.y && y <= button.y + buttonHeight) {
                this.applyMutation(button.type);
                break;
            }
        }
    }

    applyMutation(type) {
        if (this.mutationPoints > 0) {
            this.creature.mutations[type]++;
            this.mutationPoints--;

            switch(type) {
                case 'speed':
                    this.creature.speed += 0.5;
                    break;
                case 'defense':
                    // Reduces damage taken
                    break;
                case 'attack':
                    // Increases damage to enemies
                    break;
            }

            // Update creature appearance
            this.updateCreatureAppearance();
            this.showMutationUI = false;
        }
    }

    updateCreatureAppearance() {
        const r = Math.min(255, this.creature.mutations.attack * 50);
        const g = 255;
        const b = Math.min(255, this.creature.mutations.defense * 50);
        this.creature.color = `${r}, ${g}, ${b}`;
    }

    checkMutation() {
        // Check for new mutation point every 5 size points
        if (this.size >= this.lastMutationSize + 5) {
            this.mutationPoints++;
            this.lastMutationSize = Math.floor(this.size);
            // Show mutation UI automatically
            this.showMutationUI = true;
        }
    }

    drawMutationUI() {
        if (!this.showMutationUI) return;

        const buttonWidth = 150;
        const buttonHeight = 40;
        const startX = (this.canvas.width - buttonWidth) / 2;
        const startY = this.canvas.height / 2 - 60;

        // Semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw mutation options
        this.ctx.font = '20px Courier New';
        this.ctx.textAlign = 'center';

        const buttons = [
            { text: 'Speed +0.5', y: startY, color: '#00FF00' },
            { text: 'Defense +1', y: startY + 50, color: '#0000FF' },
            { text: 'Attack +1', y: startY + 100, color: '#FF0000' }
        ];

        buttons.forEach(button => {
            // Button background
            this.ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
            this.ctx.fillRect(startX, button.y, buttonWidth, buttonHeight);

            // Button text
            this.ctx.fillStyle = button.color;
            this.ctx.fillText(button.text, this.canvas.width / 2, button.y + 25);
        });

        // Draw available points
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(`Mutation Points: ${this.mutationPoints}`, this.canvas.width / 2, startY - 30);
    }

    spawnFood() {
        if (this.food.length < 5) {
            const random = Math.random();
            let selectedType = this.foodTypes[0]; // Default to normal food
            let accumulatedChance = 0;

            // Select food type based on chance
            for (const foodType of this.foodTypes) {
                accumulatedChance += foodType.chance;
                if (random <= accumulatedChance) {
                    selectedType = foodType;
                    break;
                }
            }

            this.food.push({
                x: Math.random() * (this.canvas.width - 20),
                y: Math.random() * (this.canvas.height - 20),
                size: 10,
                type: selectedType.type,
                color: selectedType.color,
                points: selectedType.points
            });
        }
    }

    applyFoodEffect(food) {
        this.score += food.points;

        switch(food.type) {
            case 'normal':
                this.size += 0.1;
                this.creature.size += 1;
                break;
            case 'speed':
                this.creature.effects.speedBoost = 300; // 5 seconds at 60fps
                break;
            case 'defense':
                this.creature.effects.defenseBoost = 300; // 5 seconds at 60fps
                break;
            case 'bonus':
                this.size += 0.2;
                this.creature.size += 2;
                break;
        }

        this.checkMutation();
    }

    updateEffects() {
        const baseSpeed = 5;
        const sizeSpeedPenalty = Math.max(0, (this.creature.size - 20) * 0.02); // 2% замедления за каждую единицу размера выше 20
        const mutationSpeedBonus = this.creature.mutations.speed * 0.5;

        // Update speed boost
        if (this.creature.effects.speedBoost > 0) {
            this.creature.effects.speedBoost--;
            // Даже с бустом скорости учитываем штраф за размер
            this.creature.speed = Math.max(1, (baseSpeed * 1.5 - sizeSpeedPenalty + mutationSpeedBonus));
        } else {
            this.creature.speed = Math.max(1, (baseSpeed - sizeSpeedPenalty + mutationSpeedBonus));
        }

        // Update defense boost
        if (this.creature.effects.defenseBoost > 0) {
            this.creature.effects.defenseBoost--;
        }
    }

    updateVisualEffects() {
        // Update orbit angle
        this.visualEffects.orbitAngle += 0.05;

        // Update pulse size
        if (this.visualEffects.pulseDirection === 1) {
            this.visualEffects.pulseSize += 0.1;
            if (this.visualEffects.pulseSize >= 1) {
                this.visualEffects.pulseDirection = -1;
            }
        } else {
            this.visualEffects.pulseSize -= 0.1;
            if (this.visualEffects.pulseSize <= -1) {
                this.visualEffects.pulseDirection = 1;
            }
        }
    }

    updateCreatureVisuals() {
        // Update trail
        if (this.creature.effects.speedBoost > 0) {
            this.creature.trail.push({
                x: this.creature.x,
                y: this.creature.y,
                size: this.creature.size,
                alpha: 1
            });

            // Update and remove old trail segments
            for (let i = this.creature.trail.length - 1; i >= 0; i--) {
                const segment = this.creature.trail[i];
                segment.alpha -= 0.1;
                if (segment.alpha <= 0) {
                    this.creature.trail.splice(i, 1);
                }
            }
        } else {
            this.creature.trail = [];
        }

        // Update glow effect
        if (this.creature.effects.speedBoost > 0 || this.creature.effects.defenseBoost > 0) {
            this.creature.glow = Math.min(1, this.creature.glow + 0.1);
        } else {
            this.creature.glow = Math.max(0, this.creature.glow - 0.1);
        }
    }

    update() {
        if (this.showMutationUI) return;

        this.updateEffects();
        this.updateVisualEffects();
        this.updateCreatureVisuals();

        // Movement
        if (this.keys['ArrowUp']) this.creature.y -= this.creature.speed;
        if (this.keys['ArrowDown']) this.creature.y += this.creature.speed;
        if (this.keys['ArrowLeft']) this.creature.x -= this.creature.speed;
        if (this.keys['ArrowRight']) this.creature.x += this.creature.speed;

        // Boundary checking
        this.creature.x = Math.max(this.creature.size, Math.min(this.canvas.width - this.creature.size, this.creature.x));
        this.creature.y = Math.max(this.creature.size, Math.min(this.canvas.height - this.creature.size, this.creature.y));

        // Update creature angle based on movement
        if (this.keys['ArrowRight']) this.creature.angle = 0;
        if (this.keys['ArrowLeft']) this.creature.angle = Math.PI;
        if (this.keys['ArrowUp']) this.creature.angle = -Math.PI/2;
        if (this.keys['ArrowDown']) this.creature.angle = Math.PI/2;

        // Update enemies
        this.enemies.forEach((enemy, index) => {
            this.updateEnemyEffects(enemy);

            // Calculate distance to player
            const dx = this.creature.x - enemy.x;
            const dy = this.creature.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if player is within detection radius
            if (distance < enemy.detectionRadius) {
                // Chase mode
                if (distance > 0) {
                    enemy.x += (dx / distance) * enemy.speed;
                    enemy.y += (dy / distance) * enemy.speed;
                }
            } else {
                // Random movement mode
                enemy.changeDirectionCounter++;
                if (enemy.changeDirectionCounter > 60) { // Change direction every ~2 seconds
                    enemy.angle = Math.random() * Math.PI * 2;
                    enemy.changeDirectionCounter = 0;
                }

                enemy.x += Math.cos(enemy.angle) * enemy.speed;
                enemy.y += Math.sin(enemy.angle) * enemy.speed;

                // Boundary checking for enemies
                if (enemy.x < 0 || enemy.x > this.canvas.width || 
                    enemy.y < 0 || enemy.y > this.canvas.height) {
                    enemy.angle = Math.atan2(
                        this.canvas.height/2 - enemy.y,
                        this.canvas.width/2 - enemy.x
                    );
                }
            }

            // Check enemy collision with food
            this.food.forEach((food, foodIndex) => {
                const foodDx = enemy.x - food.x;
                const foodDy = enemy.y - food.y;
                const foodDistance = Math.sqrt(foodDx * foodDx + foodDy * foodDy);

                if (foodDistance < enemy.size + food.size) {
                    this.food.splice(foodIndex, 1);
                    this.applyFoodEffectToEnemy(enemy, food);
                    this.particles.emit(food.x, food.y, food.color, 5);
                    this.spawnFood();
                }
            });

            // Check collision with player
            if (distance < this.creature.size + enemy.size) {
                // Reduce player size and score, affected by defense mutation and enemy power
                if (this.creature.size > 15) {
                    const damageReduction = this.creature.mutations.defense * 0.2; // 20% reduction per level
                    const powerBoost = enemy.effects.powerBoost > 0 ? 1.5 : 1;
                    const damage = Math.max(0.5, 2 * powerBoost * (1 - damageReduction));
                    this.creature.size -= damage;
                    this.size = Math.max(1, this.size - damage/10);
                    this.score = Math.max(0, this.score - 20);
                }

                // Create particles for collision
                this.particles.emit(enemy.x, enemy.y, enemy.color, 5);

                // Remove enemy and spawn a new one
                this.enemies.splice(index, 1);
                this.spawnEnemy();
            }
        });

        // Collision detection with food
        this.food.forEach((food, index) => {
            const dx = this.creature.x - food.x;
            const dy = this.creature.y - food.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.creature.size + food.size) {
                this.food.splice(index, 1);
                this.applyFoodEffect(food);
                this.particles.emit(food.x, food.y, food.color, 10);
                this.spawnFood();
            }
        });

        // Spawn new enemies if needed
        if (this.enemies.length < 3) {
            this.spawnEnemy();
        }

        // Update particles
        this.particles.update();

        // Update UI
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('sizeValue').textContent = this.size.toFixed(1);


        // Send score updates to Telegram (example - needs Telegram API integration)
        const now = Date.now();
        if (now - this.lastScoreSent > 5000) { // Send every 5 seconds
            // Replace with actual Telegram API call
            // sendTelegramUpdate(this.score);
            this.lastScoreSent = now;
        }
    }

    drawFoodEffect(food) {
        switch(food.type) {
            case 'speed':
            case 'defense':
                // Draw orbiting particles
                const particleCount = 3;
                for (let i = 0; i < particleCount; i++) {
                    const angle = this.visualEffects.orbitAngle + (i * ((Math.PI * 2) / particleCount));
                    const orbitRadius = 15;
                    const px = food.x + Math.cos(angle) * orbitRadius;
                    const py = food.y + Math.sin(angle) * orbitRadius;

                    this.ctx.beginPath();
                    this.ctx.arc(px, py, 2, 0, Math.PI * 2);
                    this.ctx.fillStyle = `rgb(${food.color})`;
                    this.ctx.fill();
                }
                break;
            case 'bonus':
                // Draw pulsing effect
                const pulseSize = 3 * this.visualEffects.pulseSize;
                this.ctx.beginPath();
                this.ctx.arc(food.x, food.y, food.size + pulseSize, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(${food.color}, 0.5)`;
                this.ctx.stroke();
                break;
        }
    }



    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw active effects indicators
        if (this.creature.effects.speedBoost > 0) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.fillRect(10, 10, 30, 10);
        }
        if (this.creature.effects.defenseBoost > 0) {
            this.ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
            this.ctx.fillRect(50, 10, 30, 10);
        }

        // Draw enemies
        this.enemies.forEach(enemy => {
            // Draw enemy glow if powered up
            if (enemy.glow > 0) {
                const glowColor = enemy.effects.speedBoost > 0 ? '255, 100, 100' : '255, 0, 0';
                this.ctx.beginPath();
                this.ctx.arc(enemy.x, enemy.y, enemy.size * 1.2, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${glowColor}, ${enemy.glow * 0.3})`;
                this.ctx.fill();
            }

            // Draw enemy body
            this.ctx.beginPath();
            this.ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgb(${enemy.color})`;
            this.ctx.fill();
        });

        // Draw food and their effects
        this.food.forEach(food => {
            // Draw base food
            this.ctx.beginPath();
            this.ctx.arc(food.x, food.y, food.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgb(${food.color})`;
            this.ctx.fill();

            // Draw food effects
            this.drawFoodEffect(food);
        });

        // Draw creature's trail
        this.creature.trail.forEach(segment => {
            this.ctx.beginPath();
            this.ctx.arc(segment.x, segment.y, segment.size * 0.8, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 100, 100, ${segment.alpha * 0.3})`;
            this.ctx.fill();
        });

        // Draw creature
        this.ctx.save();
        this.ctx.translate(this.creature.x, this.creature.y);
        this.ctx.rotate(this.creature.angle);

        // Draw glow effect
        if (this.creature.glow > 0) {
            const glowColor = this.creature.effects.speedBoost > 0 ? '255, 0, 0' : '0, 0, 255';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.creature.size * 1.2, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${glowColor}, ${this.creature.glow * 0.3})`;
            this.ctx.fill();
        }

        // Body
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.creature.size, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgb(${this.creature.color})`;
        this.ctx.fill();

        // Eyes
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(this.creature.size/2, -this.creature.size/3, this.creature.size/5, 0, Math.PI * 2);
        this.ctx.arc(this.creature.size/2, this.creature.size/3, this.creature.size/5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();

        // Draw particles
        this.particles.draw();

        // Draw mutation UI if active
        if (this.showMutationUI) {
            this.drawMutationUI();
        }
    }

    spawnEnemy() {
        if (this.enemies.length < 3) {
            const side = Math.floor(Math.random() * 4);
            let x, y;

            switch(side) {
                case 0: // top
                    x = Math.random() * this.canvas.width;
                    y = -20;
                    break;
                case 1: // right
                    x = this.canvas.width + 20;
                    y = Math.random() * this.canvas.height;
                    break;
                case 2: // bottom
                    x = Math.random() * this.canvas.width;
                    y = this.canvas.height + 20;
                    break;
                case 3: // left
                    x = -20;
                    y = Math.random() * this.canvas.height;
                    break;
            }

            this.enemies.push({
                x: x,
                y: y,
                size: 15,
                speed: 3,
                color: '255, 0, 0',
                detectionRadius: 150,
                angle: Math.random() * Math.PI * 2,
                changeDirectionCounter: 0,
                effects: {
                    speedBoost: 0,
                    powerBoost: 0
                },
                glow: 0
            });
        }
    }

    applyFoodEffectToEnemy(enemy, food) {
        switch(food.type) {
            case 'normal':
                enemy.size += 0.5;
                break;
            case 'speed':
                enemy.effects.speedBoost = 300;
                break;
            case 'defense':
                enemy.effects.powerBoost = 300;
                break;
            case 'bonus':
                enemy.size += 1;
                enemy.detectionRadius += 20;
                break;
        }
    }

    updateEnemyEffects(enemy) {
        // Update speed boost
        if (enemy.effects.speedBoost > 0) {
            enemy.effects.speedBoost--;
            enemy.speed = 4.5; // 1.5x normal speed
        } else {
            enemy.speed = 3;
        }

        // Update power boost
        if (enemy.effects.powerBoost > 0) {
            enemy.effects.powerBoost--;
        }

        // Update glow effect
        if (enemy.effects.speedBoost > 0 || enemy.effects.powerBoost > 0) {
            enemy.glow = Math.min(1, enemy.glow + 0.1);
        } else {
            enemy.glow = Math.max(0, enemy.glow - 0.1);
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    eatFood(index) {
        const food = this.food[index];
        this.score += food.points;
        this.size += food.points / 100;
        document.getElementById('scoreValue').innerText = this.score;
        document.getElementById('sizeValue').innerText = this.size.toFixed(1);

        // Apply food effects
        this.applyFoodEffect(food);

        // Create particles at food location
        this.particles.emit(food.x, food.y, food.color, 10);

        // Add haptic feedback through Telegram
        telegramHapticFeedback('impact');

        // Remove eaten food and spawn new one
        this.food.splice(index, 1);
        this.spawnFood();

        // Check if player earned a mutation point
        this.checkMutation();
    }
}

// Start the game when the page loads
window.onload = () => {
    new Game();
};