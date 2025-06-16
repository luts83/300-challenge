import React, { useEffect, useRef } from 'react';

function isLowEndDevice() {
  if (typeof window === 'undefined') return false;
  return (
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    window.innerWidth < 600
  );
}

const SpaceBackground: React.FC = () => {
  const shootingStarsRef = useRef<HTMLDivElement>(null);
  const twinklingStarsRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const mouseGlowRef = useRef<HTMLDivElement>(null);

  // 저사양/모바일이면 아예 렌더하지 않음
  if (isLowEndDevice()) return null;

  // 별똥별 생성
  const createShootingStars = () => {
    const container = shootingStarsRef.current;
    if (!container) return;

    const createMultipleStars = () => {
      const starCount = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < starCount; i++) {
        setTimeout(() => {
          const star = document.createElement('div');
          star.className = 'shooting-star';
          star.style.top = `${Math.random() * 70}%`;
          star.style.left = `${90 + Math.random() * 20}%`;
          const duration = 1.5 + Math.random() * 2;
          star.style.animationDuration = `${duration}s`;
          star.style.animationDelay = `${Math.random() * 0.5}s`;
          container.appendChild(star);

          setTimeout(() => star.remove(), (duration + 1) * 1000);
        }, i * 200);
      }
    };

    createMultipleStars();
    const interval1 = setInterval(createMultipleStars, 800);
    const interval2 = setInterval(() => {
      if (Math.random() > 0.3) createMultipleStars();
    }, 500);

    return () => {
      clearInterval(interval1);
      clearInterval(interval2);
    };
  };

  // 반짝이는 별 생성
  const createTwinklingStars = () => {
    const container = twinklingStarsRef.current;
    if (!container) return;

    const starCount = window.innerWidth > 768 ? 80 : 40;

    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.className = 'twinkle-star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 5}s`;
      star.style.animationDuration = `${2 + Math.random() * 4}s`;
      const size = Math.random() * 2 + 0.5;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      container.appendChild(star);
    }
  };

  // 파티클 생성
  const createParticles = () => {
    const container = particlesRef.current;
    if (!container) return;

    const particleCount = window.innerWidth > 768 ? 120 : 60;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle small';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 40}s`;
      container.appendChild(particle);
    }
  };

  // 마우스 글로우 효과
  const initMouseGlow = () => {
    if (window.innerWidth <= 768) return;

    const glow = mouseGlowRef.current;
    if (!glow) return;

    let mouseX = 0,
      mouseY = 0;
    let glowX = 0,
      glowY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (glow) glow.style.opacity = '1';
    };

    const handleMouseLeave = () => {
      if (glow) glow.style.opacity = '0';
    };

    const animate = () => {
      glowX += (mouseX - glowX) * 0.1;
      glowY += (mouseY - glowY) * 0.1;
      if (glow) {
        glow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`; // ← 이 줄로 수정!
      }
      requestAnimationFrame(animate);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    animate();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  };

  useEffect(() => {
    // 별/파티클 개수 줄이기
    const starCount = window.innerWidth > 768 ? 80 : 40;
    const particleCount = window.innerWidth > 768 ? 120 : 60;
    const cleanup1 = createShootingStars();
    createTwinklingStars();
    createParticles();
    const cleanup2 = initMouseGlow();

    return () => {
      cleanup1?.();
      cleanup2?.();
    };
  }, []);

  return (
    <>
      <div className="nebula" />
      <div className="aurora" />
      <div ref={shootingStarsRef} className="shooting-stars" />
      <div ref={twinklingStarsRef} className="twinkling-stars" />
      <div ref={particlesRef} className="particles" />
      <div ref={mouseGlowRef} className="mouse-glow" />
    </>
  );
};

export default SpaceBackground;
