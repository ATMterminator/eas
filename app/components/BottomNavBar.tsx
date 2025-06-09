import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

const navItems = [
  { name: 'Health', icon: 'favorite-border', text: '健康' },
  { name: 'Sport', icon: 'directions-run', text: '运动' },
  { name: 'Chart', icon: 'bar-chart', text: '图表' },
  { name: 'Me', icon: 'person-outline', text: '我' },
];

interface BottomNavBarProps {
  currentPage: 'Health' | 'Sport' | 'Chart' | 'Me';
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentPage }) => {
  const router = useRouter();

  return (
    <View style={styles.navigationContainer}>
      {navItems.map((item) => {
        const isActive = currentPage === item.name;
        return (
          <TouchableOpacity
            key={item.name}
            style={styles.navButton}
            onPress={() => router.push(`/${item.name}` as any)}
          >
            <MaterialIcons
              name={item.icon as any}
              size={24}
              color={isActive ? styles.activeIcon.color : styles.inactiveIcon.color}
            />
            <Text style={[styles.buttonText, isActive && styles.activeText]}>
              {item.text}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navigationContainer: {
    flexDirection: 'row',
    height: 65,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingBottom: 5,
    paddingTop: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  activeText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  activeIcon: {
    color: '#007AFF',
  },
  inactiveIcon: {
    color: '#888888',
  },
});

export default BottomNavBar; 