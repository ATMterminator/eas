import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ActivityIndicator, 
  AppState, 
  AppStateStatus,
  Platform,
  Linking,
  Modal,
  TextInput,
  Button
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import BottomNavBar from './components/BottomNavBar';

// 只在移动平台上导入 ActivityRecognition
let ActivityRecognition: any = null;
if (Platform.OS !== 'web') {
  ActivityRecognition = require('expo-activity-recognition');
}

interface ExerciseData {
  type: string;
  duration: number;
  calories: number;
  timestamp: number;
}

// 定义运动类型及其图标
const EXERCISE_TYPES = [
  { key: 'running', name: '跑步', icon: 'directions-run' as const, color: '#FF6B6B' },
  { key: 'walking', name: '徒步', icon: 'directions-walk' as const, color: '#4ECDC4' },
  { key: 'jumping', name: '跳绳', icon: 'fitness-center' as const, color: '#FFD166' }
];

export default function Sport() {
  const router = useRouter();
  const [steps, setSteps] = useState(0);
  const [weight, setWeight] = useState(60);
  const [exerciseData, setExerciseData] = useState<ExerciseData[]>([]);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [manualSteps, setManualSteps] = useState('');
  
  const isInitializedRef = useRef(false);
  const stepSubscriptionRef = useRef<Pedometer.Subscription | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const getTodayKey = useCallback(() => {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  }, []);

  // 修复后的权限请求函数
  const requestPedometerPermission = useCallback(async () => {
    try {
      // 在 Web 平台上直接返回 false
      if (Platform.OS === 'web') {
        setPermissionDenied(true);
        setPermissionError('Web 平台不支持计步功能');
        return false;
      }

      if (Platform.OS === 'android' && ActivityRecognition) {
        // Android 需要额外的活动识别权限
        const { status: activityStatus } = await ActivityRecognition.requestPermissionsAsync();
        if (activityStatus !== 'granted') {
          setPermissionDenied(true);
          setPermissionError('需要活动识别权限才能跟踪您的步数');
          return false;
        }
      }

      // 检查基础计步权限
      const { status } = await Pedometer.requestPermissionsAsync();
      
      if (status !== 'granted') {
        setPermissionDenied(true);
        setPermissionError('需要计步权限才能跟踪您的步数，请前往设置开启权限');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('请求计步权限失败:', error);
      setPermissionDenied(true);
      setPermissionError('请求权限时发生错误');
      return false;
    }
  }, []);

  const checkPedometerAvailability = useCallback(async () => {
    try {
      // 在 Web 平台上直接返回 false
      if (Platform.OS === 'web') {
        setIsPedometerAvailable(false);
        setPermissionError('Web 平台不支持计步功能');
        return false;
      }

      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(isAvailable);
      
      if (!isAvailable) {
        console.log('设备不支持计步功能');
        setPermissionError('您的设备不支持计步功能');
      }
      return isAvailable;
    } catch (error) {
      console.error('检查计步器失败:', error);
      setIsPedometerAvailable(false);
      setPermissionError('检查计步功能时发生错误');
      return false;
    }
  }, []);

  const getStepsData = useCallback(async () => {
    try {
      const todayKey = getTodayKey();
      
      // 先尝试从本地存储获取今日步数
      const savedSteps = await AsyncStorage.getItem(`steps_${todayKey}`);
      let currentSteps = savedSteps ? parseInt(savedSteps) : 0;
      
      if (isPedometerAvailable && !permissionDenied && Platform.OS !== 'web') {
        try {
          if (Platform.OS === 'ios') {
            // iOS 可以直接获取今日步数
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const { steps: healthKitSteps } = await Pedometer.getStepCountAsync(startOfDay, new Date());
            
            // 如果健康数据的步数大于本地存储的步数，则更新
            if (healthKitSteps > currentSteps) {
              currentSteps = healthKitSteps;
              await AsyncStorage.setItem(`steps_${todayKey}`, currentSteps.toString());
            }
          } else if (Platform.OS === 'android') {
            // Android 需要实时监听步数变化
            if (stepSubscriptionRef.current) {
              stepSubscriptionRef.current.remove();
            }
            
            stepSubscriptionRef.current = Pedometer.watchStepCount(result => {
              const newSteps = result.steps;
              console.log('Android 步数更新:', newSteps);
              
              // 只有当新步数大于当前步数时才更新
              if (newSteps > currentSteps) {
                setSteps(newSteps);
                AsyncStorage.setItem(`steps_${todayKey}`, newSteps.toString());
              }
            });
          }
        } catch (error) {
          console.error('获取步数失败:', error);
          setPermissionError('获取步数失败，请检查权限设置');
        }
      }
      
      setSteps(currentSteps);
    } catch (error) {
      console.error('获取步数数据失败:', error);
      setPermissionError('获取步数数据时发生错误');
    }
  }, [isPedometerAvailable, permissionDenied, getTodayKey]);

  const loadData = useCallback(async () => {
    try {
      const [weightData, exerciseDataStr] = await Promise.all([
        AsyncStorage.getItem('weight'),
        AsyncStorage.getItem(`exercise_${getTodayKey()}`)
      ]);

      if (weightData) setWeight(parseFloat(weightData));
      if (exerciseDataStr) {
        const data = JSON.parse(exerciseDataStr);
        setExerciseData(data.sort((a: ExerciseData, b: ExerciseData) => b.timestamp - a.timestamp));
      }

      await getStepsData();
    } catch (error) {
      console.error('加载数据失败:', error);
      setPermissionError('加载数据时发生错误');
    }
  }, [getStepsData, getTodayKey]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const initialize = useCallback(async () => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    setIsLoading(true);
    setPermissionError('');
    
    try {
      console.log('开始初始化...');
      
      const isAvailable = await checkPedometerAvailability();
      
      if (isAvailable) {
        await requestPedometerPermission();
      }
      
      await loadData();
      
      console.log('初始化完成');
    } catch (error) {
      console.error('初始化失败:', error);
      setPermissionError('初始化运动功能时发生错误');
    } finally {
      setIsLoading(false);
    }
  }, [requestPedometerPermission, checkPedometerAvailability, loadData]);

  useEffect(() => {
    console.log('组件挂载');
    
    initialize();
    
    const appStateChangeHandler = (nextAppState: AppStateStatus) => {
      console.log('应用状态变化:', nextAppState);
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('应用从后台恢复，刷新步数');
        loadData();
      }
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', appStateChangeHandler);

    return () => {
      console.log('组件卸载');
      subscription.remove();
      
      if (stepSubscriptionRef.current) {
        stepSubscriptionRef.current.remove();
        stepSubscriptionRef.current = null;
      }
    };
  }, [initialize, loadData]);

  const openAppSettings = useCallback(() => {
    Linking.openSettings().catch(() => {
      Alert.alert('无法打开设置', '请手动前往系统设置开启权限');
    });
  }, []);

  const handleManualStepInput = async () => {
    const numSteps = parseInt(manualSteps, 10);
    if (!isNaN(numSteps) && numSteps >= 0) {
      const todayKey = getTodayKey();
      await AsyncStorage.setItem(`steps_${todayKey}`, numSteps.toString());
      setSteps(numSteps);
      setIsModalVisible(false);
      setPermissionError('');
      setPermissionDenied(false);
    } else {
      Alert.alert('无效输入', '请输入一个有效的步数');
    }
  };

  const calculateCalories = useCallback((type: string, duration: number) => {
    const baseCalories = {
      running: 8,
      walking: 5,
      jumping: 9
    }[type] || 0;

    return baseCalories * (duration / 60) * weight * 1.05;
  }, [weight]);

  const getExerciseDataByType = useCallback((type: string) => {
    return exerciseData.filter(data => data.type === type);
  }, [exerciseData]);

  const getTotalExerciseData = useCallback((type: string) => {
    const filteredData = getExerciseDataByType(type);
    const totalDuration = filteredData.reduce((sum, data) => sum + data.duration, 0);
    const totalCalories = filteredData.reduce((sum, data) => sum + data.calories, 0);
    return { totalDuration, totalCalories };
  }, [getExerciseDataByType]);

  const getTotalCalories = useCallback(() => {
    return exerciseData.reduce((sum, data) => sum + data.calories, 0);
  }, [exerciseData]);

  const renderTotalCalories = () => (
    <View style={styles.totalCaloriesContainer}>
      <Text style={styles.totalCaloriesText}>今日总消耗: {getTotalCalories().toFixed(1)} 大卡</Text>
    </View>
  );

  const clearData = useCallback(async () => {
    Alert.alert(
      '确认',
      '确定要清空今日的所有运动数据吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '清空', 
          onPress: async () => {
            const todayKey = getTodayKey();
            await AsyncStorage.setItem(`exercise_${todayKey}`, '[]');
            setExerciseData([]);
          }
        }
      ]
    );
  }, [getTodayKey]);

  const navigateToExerciseTimer = (type: string) => {
    router.push({ 
      pathname: "./Exercise_Timer", 
      params: { type } 
    });
  };

  const renderExerciseModule = (type: string) => {
    const exerciseType = EXERCISE_TYPES.find(t => t.key === type);
    
    if (!exerciseType) return null;
    
    const { name, icon, color } = exerciseType;
    const { totalDuration, totalCalories } = getTotalExerciseData(type);
    const records = getExerciseDataByType(type);

    return (
      <TouchableOpacity
        key={type}
        style={[styles.exerciseModule, { borderLeftColor: color }]}
        onPress={() => navigateToExerciseTimer(type)}
      >
        <View style={styles.exerciseHeader}>
          <MaterialIcons name={icon} size={24} color={color} />
          <Text style={[styles.exerciseTitle, { color }]}>{name}</Text>
        </View>
        
        <Text style={styles.exerciseStats}>
          今日总计: {totalDuration}分钟，消耗{Math.round(totalCalories)}千卡
        </Text>
        
        {records.length > 0 && (
          <View style={styles.recordsContainer}>
            {records.slice(0, 3).map((record, index) => (
              <Text key={index} style={styles.recordItem}>
                {new Date(record.timestamp).toLocaleTimeString()} - 
                {record.duration}分钟 ({Math.round(record.calories)}千卡)
              </Text>
            ))}
            {records.length > 3 && (
              <Text style={styles.moreRecords}>+ {records.length - 3} 条更多记录</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3182CE" style={styles.loadingIndicator} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>手动输入步数</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入今天的步数"
              keyboardType="number-pad"
              value={manualSteps}
              onChangeText={setManualSteps}
            />
            <View style={styles.modalButtonContainer}>
              <Button title="取消" onPress={() => setIsModalVisible(false)} />
              <Button title="确认" onPress={handleManualStepInput} />
            </View>
          </View>
        </View>
      </Modal>

      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loadingIndicator} />
      ) : permissionDenied ? (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>{permissionError}</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={() => setIsModalVisible(true)}>
            <Text style={styles.permissionButtonText}>手动输入步数</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.stepsModule}>
            <View style={styles.stepsHeader}>
              <Text style={styles.stepsTitle}>今日步数</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(true)}>
                <Text style={styles.manualInputButton}>手动输入</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.stepsCircle}>
              <Text style={styles.stepsCount}>{steps}</Text>
            </View>
          </View>

          <View style={styles.exerciseModules}>
            {EXERCISE_TYPES.map(exercise => renderExerciseModule(exercise.key))}
          </View>
          
          {renderTotalCalories()}

          {exerciseData.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearData}>
              <MaterialIcons name="delete-sweep" size={24} color="white" />
              <Text style={styles.clearButtonText}>清空今日运动数据</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      <BottomNavBar currentPage="Sport" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  contentContainer: {
    padding: 20,
  },
  // Header Section
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#171717',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#718096',
  },
  stepsValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#3182CE',
    marginVertical: 8,
  },
  stepsSubtitle: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  manualInputButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  // Exercise Modules
  module: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#171717',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  moduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  moduleTextContainer: {
    justifyContent: 'center',
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  moduleSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  moduleButton: {
    backgroundColor: '#3182CE',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  moduleButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  // Summary Section
  summaryContainer: {
    marginTop: 10,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#171717',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  summaryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 16,
  },
  clearButton: {
    backgroundColor: '#E53E3E',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  // Modal & Permission Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1A202C',
  },
  input: {
    width: '100%',
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#3182CE',
    marginRight: 10,
  },
  cancelButton: {
    backgroundColor: '#E2E8F0',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButtonText: {
    color: '#2D3748',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 20,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#3182CE',
    padding: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  loadingIndicator: {
    marginTop: 50,
  },
  stepsModule: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepsCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepsCount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  exerciseModules: {
    marginBottom: 20,
  },
  exerciseModule: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  exerciseStats: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  recordsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 10,
  },
  recordItem: {
    fontSize: 14,
    color: '#777',
    marginBottom: 5,
  },
  moreRecords: {
    fontSize: 14,
    color: '#2E86C1',
    fontStyle: 'italic',
  },
  totalCaloriesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  totalCaloriesText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
});