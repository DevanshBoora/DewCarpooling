import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

interface Props {
  children: React.ReactNode;
  duration?: number;
}

const FadeOnFocus: React.FC<Props> = ({ children, duration = 180 }) => {
  const isFocused = useIsFocused();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isFocused ? 1 : 0.96,
      duration,
      useNativeDriver: true,
    }).start();
  }, [isFocused, duration, opacity]);

  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>;
};

export default FadeOnFocus;
