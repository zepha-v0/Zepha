import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';

const { width } = Dimensions.get('window');

// 🧠 STATES
const STATES = {
  SLEEP: "sleep",
  WAKE: "wake",
  IDLE: "idle",
  CURIOUS: "curious",
  GUARD: "guard",
  WATCH: "watch",
  OFFER: "offer",
  CONSUME: "consume",
  THINKING: "thinking",
};

export default function HomeScreen() {
  const [state, setState] = useState(STATES.WAKE);

  const posX = useRef(new Animated.Value(0)).current;
  const posY = useRef(new Animated.Value(-300)).current;
  const idleAnim = useRef(new Animated.Value(0)).current;

  const idleLoop = useRef<Animated.CompositeAnimation | null>(null);

  // 🕸️ THREAD
  const threadX = useRef(new Animated.Value(-200)).current;
  const threadOpacity = useRef(new Animated.Value(0)).current;

  // 🕷️ WAKE ENTRY
  useEffect(() => {
    Animated.timing(posY, {
      toValue: 0,
      duration: 6000,
      useNativeDriver: true,
    }).start(() => {
      setState(STATES.IDLE);
    });
  }, []);

  // 🧠 HANDLE IDLE LOOP
  useEffect(() => {
    if (state === STATES.IDLE) {
      startIdleMovement();
    } else {
      if (idleLoop.current) {
        idleLoop.current.stop();
      }
      idleAnim.setValue(0);
    }
  }, [state]);

  // 🕷️ IDLE FLOAT
  const startIdleMovement = () => {
    idleLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(idleAnim, {
          toValue: 4,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(idleAnim, {
          toValue: -4,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    idleLoop.current.start();
  };

  // 🕷️ OFFER
  const startOffer = () => {
    setState(STATES.OFFER);

    Animated.parallel([
      Animated.timing(threadOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(threadX, {
        toValue: 100,
        duration: 3000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        startConsume();
      }, 3000);
    });
  };

  // 🕷️ CONSUME
  const startConsume = () => {
    setState(STATES.CONSUME);

    Animated.parallel([
      Animated.timing(threadOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(threadX, {
        toValue: -200,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setState(STATES.IDLE);
    });
  };

  // 🕷️ GUARD
  const goToGuard = () => {
    setState(STATES.THINKING);

    Animated.sequence([
      Animated.timing(idleAnim, {
        toValue: 8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(idleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setState(STATES.GUARD);

      Animated.parallel([
        Animated.timing(posX, {
          toValue: width - 120,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: 50,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // 🕷️ RETURN TO IDLE
  const goToIdle = () => {
    setState(STATES.WATCH);

    setTimeout(() => {
      setState(STATES.IDLE);

      Animated.parallel([
        Animated.timing(posX, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1000);
  };

  // 🧠 TEST CONTROL
  const handlePress = () => {
    if (state === STATES.IDLE) startOffer();
    else if (state === STATES.OFFER) startConsume();
    else if (state === STATES.GUARD) goToIdle();
    else goToGuard();
  };

  // 🧠 DEBUG TEXT
  const getText = () => {
    switch (state) {
      case STATES.WAKE:
        return "arriving";
      case STATES.IDLE:
        return "with you";
      case STATES.OFFER:
        return "offering";
      case STATES.CONSUME:
        return "handled";
      case STATES.GUARD:
        return "holding focus";
      case STATES.WATCH:
        return "settling";
      case STATES.THINKING:
        return "...";
      default:
        return "";
    }
  };

  return (
    <View style={styles.container}>

      {/* 🕷️ Zepha */}
      <Animated.View
        style={[
          styles.zepha,
          {
            transform: [
              { translateX: posX },
              { translateY: Animated.add(posY, idleAnim) },
            ],
          },
        ]}
      >
        <Pressable onPress={handlePress}>
          <Text
            style={[
              styles.spider,
              state === STATES.GUARD && styles.guardMode,
            ]}
          >
            🕷️
          </Text>
        </Pressable>
      </Animated.View>

      {/* 🕸️ Thread */}
      <Animated.View
        style={[
          styles.thread,
          {
            opacity: threadOpacity,
            transform: [{ translateX: threadX }],
          },
        ]}
      >
        <Text style={styles.threadItem}>📓</Text>
      </Animated.View>

      {/* Debug */}
      <Text style={styles.text}>{getText()}</Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  zepha: {
    position: 'absolute',
    bottom: 100,
    left: 30,
  },
  spider: {
    fontSize: 90,
  },
  guardMode: {
    transform: [{ scale: 1.1 }],
  },
  thread: {
    position: 'absolute',
    bottom: 120,
    left: 0,
  },
  threadItem: {
    fontSize: 40,
  },
  text: {
    color: '#94a3b8',
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
});
