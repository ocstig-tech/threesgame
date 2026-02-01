import { useEffect, useRef } from "react";

export function useTurnNotification(isMyTurn: boolean, enabled: boolean = true) {
  const prevIsMyTurn = useRef(isMyTurn);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for notification sound
    if (!audioRef.current) {
      audioRef.current = new Audio();
      // Use a simple beep tone (base64 encoded short beep)
      audioRef.current.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQMHNcPl8stNBAEkpumzzUsEATR2upGWciY7ZZOmqnM1ACpyr8O/fBYAK2Cfzt6TOgAHSqvi48sZAAZJfry2qmQQABFVn7uonUoAASJcnLarjykAC0B5s7ibWwIAKl2kxLB2EQAdU5e8vYc2ABxHirq+lk8AEkOCuMClYQAPQYK5waVhABBDg7jBpWAAEEODuMGlYAAPQ4O4waVhAA9Dg7jBpWEAD0ODuMGlYQAPQ4O4waVhAA9Dg7jBpWEAEEODuMGlYAAQQ4O4waVgABBDg7jBpWAAEEODuMGlYAAQQ4O4waVgABBDg7jBpWAAD0ODuMGlYQAPQ4O4waVhAA9Dg7jBpWEAD0ODuMGlYQAPQ4O4waVhAA9Dg7jBpWEAD0ODuMGlYQAPQ4O4waVhAA9Dg7jBpWEAD0ODuMGlYQAPQ4O4wqVhAA9Dg7nCpmEAD0KDusOnYgAPQoS7xKhjAA5ChbzFqWQADkKGvcaqZQANQYe+x6tnAAxBib/IrGgADECKwcquaQALQIvCy69rAApAjMTMsGwACj+NxM2xbgAJP47Fz7JvAAk+j8fQs3AACDyQyNG0cgAIPpHJ0rVzAAc9ksrTt3UBBzuTy9S4dwEGO5TM1bl5AQY5lc7Wu3sBBTmWz9i8fQEEOJfQ2b1/AQQ3mNHbv4ECBDWZ0ty/gwIENJvT3cGFAwMznNXdwoYEAjKd1t7DiAQCMZ7Y38SKBQA=";
    }
  }, []);

  useEffect(() => {
    // Detect when it becomes my turn (transition from false to true)
    if (enabled && isMyTurn && !prevIsMyTurn.current) {
      // Play sound
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          // Audio play failed - user hasn't interacted yet, ignore
        });
      }

      // Vibrate if supported (mobile)
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }

    prevIsMyTurn.current = isMyTurn;
  }, [isMyTurn, enabled]);

  return { isMyTurn };
}
