import React, { useEffect, useRef, useCallback, useMemo } from 'react';

function isLowEndDevice() {
  if (typeof window === 'undefined') return false;
  return (
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4) ||
    window.innerWidth < 600
  );
}

// 성능 최적화를 위한 디바이스 감지
function getDevicePerformance() {
  if (typeof window === 'undefined') return 'high';

  const isMobile = window.innerWidth <= 768;
  const isLowEnd = isLowEndDevice();

  if (isLowEnd) return 'low';
  if (isMobile) return 'medium';
  return 'high';
}

const SpaceBackground: React.FC = () => {
  const shootingStarsRef = useRef<HTMLDivElement>(null);
  const twinklingStarsRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const mouseGlowRef = useRef<HTMLDivElement>(null);

  // 성능 레벨에 따른 설정
  const performanceLevel = useMemo(() => getDevicePerformance(), []);
  const isVisible = useRef(true);

  // 별똥별 생성 (성능 최적화)
  const createShootingStars = useCallback(() => {
    const container = shootingStarsRef.current;
    if (!container) return;

    const createMultipleStars = () => {
      if (!isVisible.current) return;

      // 성능 레벨에 따른 별똥별 개수 조절
      const maxStars = performanceLevel === 'high' ? 3 : performanceLevel === 'medium' ? 2 : 1;
      const starCount = Math.floor(Math.random() * maxStars) + 1;

      for (let i = 0; i < starCount; i++) {
        setTimeout(() => {
          if (!isVisible.current) return;

          const star = document.createElement('div');
          star.className = 'shooting-star';
          star.style.top = `${Math.random() * 70}%`;
          star.style.left = `${90 + Math.random() * 20}%`;
          const duration = 1.5 + Math.random() * 2;
          star.style.animationDuration = `${duration}s`;
          star.style.animationDelay = `${Math.random() * 0.5}s`;
          container.appendChild(star);

          setTimeout(
            () => {
              if (star.parentNode) {
                star.remove();
              }
            },
            (duration + 1) * 1000
          );
        }, i * 200);
      }
    };

    createMultipleStars();

    // 성능 레벨에 따른 인터벌 조절
    const interval1 = setInterval(createMultipleStars, performanceLevel === 'high' ? 800 : 1200);
    const interval2 = setInterval(
      () => {
        if (Math.random() > 0.3 && isVisible.current) createMultipleStars();
      },
      performanceLevel === 'high' ? 500 : 800
    );

    return () => {
      clearInterval(interval1);
      clearInterval(interval2);
    };
  }, [performanceLevel]);

  // 반짝이는 별 생성 (성능 최적화)
  const createTwinklingStars = useCallback(() => {
    const container = twinklingStarsRef.current;
    if (!container) return;

    // 성능 레벨에 따른 별 개수 조절
    const starCount = performanceLevel === 'high' ? 80 : performanceLevel === 'medium' ? 50 : 25;

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
  }, [performanceLevel]);

  // 파티클 생성 (성능 최적화)
  const createParticles = useCallback(() => {
    const container = particlesRef.current;
    if (!container) return;

    // 성능 레벨에 따른 파티클 개수 조절
    const particleCount =
      performanceLevel === 'high' ? 120 : performanceLevel === 'medium' ? 80 : 40;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle small';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 40}s`;
      container.appendChild(particle);
    }
  }, [performanceLevel]);

  // 마우스 글로우 효과 (성능 최적화)
  const initMouseGlow = useCallback(() => {
    // 모바일에서는 마우스 글로우 비활성화
    if (window.innerWidth <= 768 || performanceLevel === 'low') return;

    const glow = mouseGlowRef.current;
    if (!glow) return;

    let mouseX = 0,
      mouseY = 0;
    let glowX = 0,
      glowY = 0;
    let animationId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (glow) glow.style.opacity = '1';
    };

    const handleMouseLeave = () => {
      if (glow) glow.style.opacity = '0';
    };

    const animate = () => {
      if (!isVisible.current) return;

      glowX += (mouseX - glowX) * 0.1;
      glowY += (mouseY - glowY) * 0.1;
      if (glow) {
        glow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`;
      }
      animationId = requestAnimationFrame(animate);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    animate();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [performanceLevel]);

  useEffect(() => {
    // 저사양/모바일이면 아예 렌더하지 않음
    if (isLowEndDevice()) return;

    const cleanup1 = createShootingStars();
    createTwinklingStars();
    createParticles();
    const cleanup2 = initMouseGlow();

    // 페이지 가시성 변경 감지
    const handleVisibilityChange = () => {
      isVisible.current = !document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cleanup1?.();
      cleanup2?.();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [createShootingStars, createTwinklingStars, createParticles, initMouseGlow]);

  // 저사양/모바일이면 아예 렌더하지 않음
  if (isLowEndDevice()) return null;

  return (
    <>
      <div className="nebula" />
      <div className="aurora" />
      <div ref={shootingStarsRef} className="shooting-stars" />
      <div ref={twinklingStarsRef} className="twinkling-stars" />
      <div ref={particlesRef} className="particles" />
      {performanceLevel !== 'low' && <div ref={mouseGlowRef} className="mouse-glow" />}
    </>
  );
};

export default SpaceBackground;
