class ParticleSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.particles = [];
    }

    createParticle(x, y, color) {
        return {
            x: x,
            y: y,
            color: color,
            velocity: {
                x: (Math.random() - 0.5) * 4,
                y: (Math.random() - 0.5) * 4
            },
            life: 1.0,
            decay: 0.02
        };
    }

    emit(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle(x, y, color));
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.velocity.x;
            particle.y += particle.velocity.y;
            particle.life -= particle.decay;

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        this.particles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${particle.color}, ${particle.life})`;
            this.ctx.fill();
        });
    }
}