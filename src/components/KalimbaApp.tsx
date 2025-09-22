import React, { useState, useRef, useEffect } from 'react';
import { Play, ArrowLeft, Menu } from 'lucide-react';

// Kalimba tine configuration matching the design
const kalimbaTines = [
  // 左侧琴键 (从外到内)
  { id: 1, number: '6', frequency: 392, position: 0, length: 120 },
  { id: 2, number: '4', frequency: 349, position: 1, length: 110 },
  { id: 3, number: '2', frequency: 294, position: 2, length: 100 },
  { id: 4, number: '7', frequency: 440, position: 3, length: 90 },
  { id: 5, number: '5', frequency: 370, position: 4, length: 80 },
  { id: 6, number: '3', frequency: 330, position: 5, length: 70 },
  { id: 7, number: '1', frequency: 262, position: 6, length: 60 },
  // 中心琴键
  { id: 8, number: '1', frequency: 523, position: 7, length: 50 },
  // 右侧琴键 (从内到外)
  { id: 9, number: '3', frequency: 659, position: 8, length: 60 },
  { id: 10, number: '5', frequency: 784, position: 9, length: 70 },
  { id: 11, number: '7', frequency: 880, position: 10, length: 80 },
  { id: 12, number: '2', frequency: 587, position: 11, length: 90 },
  { id: 13, number: '4', frequency: 698, position: 12, length: 100 },
  { id: 14, number: '6', frequency: 1047, position: 13, length: 110 },
  { id: 15, number: '1', frequency: 1319, position: 14, length: 120 },
];

const KalimbaApp: React.FC = () => {
  const [playedNotes, setPlayedNotes] = useState<string[]>([]);
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPlayedTine, setLastPlayedTine] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentExpression, setCurrentExpression] = useState(0);
  const [gradientPhase, setGradientPhase] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize Web Audio Context
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Background gradient animation
  useEffect(() => {
    const gradientInterval = setInterval(() => {
      setGradientPhase(prev => (prev + 1) % 360);
    }, 100); // Update every 100ms for smooth animation
    
    return () => {
      clearInterval(gradientInterval);
    };
  }, []);

  // Expression animation effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isPlaying) {
      intervalId = setInterval(() => {
        setCurrentExpression(prev => (prev + 1) % 4);
      }, 300);
    } else {
      setCurrentExpression(0);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying]);

  // Auto stop playing animation after no activity
  useEffect(() => {
    if (activeNote !== null) {
      setIsPlaying(true);
      const timer = setTimeout(() => {
        setIsPlaying(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeNote]);
  const playNote = (frequency: number, tineId: number, number: string) => {
    // 防止在短时间内重复播放同一个音符
    if (lastPlayedTine === tineId && Date.now() - (playNote as any).lastPlayTime < 100) {
      return;
    }
    (playNote as any).lastPlayTime = Date.now();
    setLastPlayedTine(tineId);

    if (!audioContextRef.current) return;

    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1.5);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 1.5);

    setActiveNote(tineId);
    setTimeout(() => setActiveNote(null), 200);

    setPlayedNotes(prev => {
      const newNotes = [...prev, number];
      return newNotes.slice(-5); // Keep only last 5 notes
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.getAttribute('data-tine-id')) {
      const tineId = parseInt(element.getAttribute('data-tine-id')!);
      const tine = kalimbaTines.find(t => t.id === tineId);
      if (tine) {
        playNote(tine.frequency, tine.id, tine.number);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.getAttribute('data-tine-id')) {
      const tineId = parseInt(element.getAttribute('data-tine-id')!);
      const tine = kalimbaTines.find(t => t.id === tineId);
      if (tine && lastPlayedTine !== tineId) {
        playNote(tine.frequency, tine.id, tine.number);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastPlayedTine(null);
  };

  const handleMouseEnter = (tine: typeof kalimbaTines[0]) => {
    if (isDragging) {
      playNote(tine.frequency, tine.id, tine.number);
    }
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setLastPlayedTine(null);
  };

  // Expression configurations
  const expressions = [
    { eyes: '• •', mouth: '‿' }, // Happy
    { eyes: '◕ ◕', mouth: 'o' }, // Surprised
    { eyes: '^ ^', mouth: '‿' }, // Joyful
    { eyes: '● ●', mouth: '◡' }, // Content
  ];

  const currentFace = expressions[currentExpression];

  // Generate dynamic gradient based on color palette from your image
  const getBackgroundGradient = () => {
    const colors = [
      '#8B7355', // Brown
      '#4A9B8E', // Teal
      '#5B7AA0', // Blue
      '#8B6F9B', // Purple
      '#A0647A', // Mauve
      '#7A8B9B', // Blue-gray
      '#B8860B', // Gold
      '#6B8E23', // Olive
      '#4682B4', // Steel blue
      '#DA70D6', // Orchid
    ];
    
    const index1 = Math.floor(gradientPhase / 36) % colors.length;
    const index2 = (index1 + 1) % colors.length;
    return `linear-gradient(135deg, ${colors[index1]}, ${colors[index2]})`;
  };

  const getTineColor = (position: number) => {
    const ratio = position / (kalimbaTines.length - 1);
    const hue = 240 + (ratio * 60); // From blue-gray to pink-purple
    const saturation = 20 + (ratio * 40);
    const lightness = 70 - (ratio * 10);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-between p-4 relative overflow-hidden select-none transition-all duration-1000 ease-in-out"
      style={{
        background: getBackgroundGradient()
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseUp={handleMouseUp}
    >
      {/* Display Screen */}
      <div className="mt-8 mb-4">
        <div className="bg-black rounded-full px-6 py-3 min-w-[200px] text-center">
          <div className="text-white text-xl font-mono tracking-wider">
            {playedNotes.length > 0 ? playedNotes.join(' ') : '1 3 5 7 2 4 6'}
          </div>
        </div>
      </div>

      {/* Kalimba Tines */}
      <div className="flex-1 flex items-center justify-center w-full max-w-lg mx-auto">
        <div className="relative w-full h-64 flex items-end justify-center touch-none">
          {kalimbaTines.map((tine) => {
            const isActive = activeNote === tine.id;
            const tineColor = getTineColor(tine.position);
            
            return (
              <button
                key={tine.id}
                data-tine-id={tine.id}
                className={`
                  absolute transform transition-all duration-150 ease-out
                  ${isActive ? 'scale-105 -translate-y-2' : 'hover:scale-102 hover:-translate-y-1'}
                  cursor-pointer active:scale-95 touch-none
                `}
                style={{
                  left: `${(tine.position / (kalimbaTines.length - 1)) * 100}%`,
                  transform: `translateX(-50%) ${isActive ? 'translateY(-8px) scale(1.05)' : ''}`,
                  height: `${tine.length + 40}px`,
                  width: '12px',
                  backgroundColor: isActive ? '#ffffff' : tineColor,
                  borderRadius: '6px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  boxShadow: isActive 
                    ? '0 4px 20px rgba(255,255,255,0.5), inset 0 2px 4px rgba(255,255,255,0.3)'
                    : '0 2px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)',
                }}
                onClick={() => playNote(tine.frequency, tine.id, tine.number)}
                onMouseEnter={() => handleMouseEnter(tine)}
                onMouseDown={handleMouseDown}
              >
                <div 
                  className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700"
                  style={{ 
                    color: isActive ? '#ffffff' : '#4a5568',
                    textShadow: isActive ? '0 0 8px rgba(255,255,255,0.8)' : 'none'
                  }}
                >
                  {tine.number}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Play Button */}
      <div className="my-8">
        <button 
          className={`w-20 h-20 bg-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-150 shadow-lg ${
            isPlaying ? 'animate-pulse' : ''
          }`}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          <div className="text-white text-center leading-none">
            {/* Animated Smiley Face */}
            <div className="relative flex flex-col items-center justify-center h-full">
              {/* Eyes */}
              <div className={`text-lg font-bold mb-1 transition-all duration-300 ${
                isPlaying ? 'transform scale-110' : ''
              }`}>
                {currentFace.eyes}
              </div>
              {/* Mouth */}
              <div className={`text-xl font-bold transition-all duration-300 ${
                isPlaying ? 'transform scale-110' : ''
              }`}>
                {currentFace.mouth}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="w-full flex justify-between items-center pb-4">
        <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all duration-150 shadow-md">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        
        <button className="flex flex-col items-center justify-center hover:opacity-80 active:scale-95 transition-all duration-150">
          <div className="space-y-1">
            <div className="w-6 h-0.5 bg-white rounded-full"></div>
            <div className="w-6 h-0.5 bg-white rounded-full"></div>
            <div className="w-6 h-0.5 bg-white rounded-full"></div>
          </div>
        </button>
      </div>

      {/* Home Indicator */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="w-32 h-1 bg-white rounded-full opacity-60"></div>
      </div>
    </div>
  );
};

export default KalimbaApp;