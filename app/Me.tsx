import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  FlatList,
  Modal,
  Button,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ActivityIndicator } from 'react-native';
import BottomNavBar from './components/BottomNavBar';
import { MaterialIcons } from '@expo/vector-icons';

const CIRCLE_RADIUS = 110;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;


const SEDENTARY_PRESET_MESSAGES = [
  '长时间坐着不利于健康，起来活动一下吧！',
  '久坐易疲劳，起身舒展一下筋骨吧！',
  '别忘了定时活动，久坐会增加健康风险哦！',
  '每小时起身活动5分钟，健康生活从点滴开始！',
];


const DRINKING_PRESET_MESSAGES = [
  '记得喝水哦，保持身体水分平衡！',
  '喝水时间到，每天8杯水，健康常相随！',
  '适当饮水有助于提高工作效率！',
  '别忘记补水，你的身体需要水分！',
];

const Me = () => {
  const router = useRouter();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [reminderLocationInput, setReminderLocationInput] = useState('');
  const [checkInDays, setCheckInDays] = useState(0);
  const [suggestedLocations, setSuggestedLocations] = useState<any[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const TENCENT_MAP_API_KEY = 'X5MBZ-4M7WU-RAWVF-GVCZL-ADAKQ-D2FWN'; 
  const [sedentaryReminderMessage, setSedentaryReminderMessage] = useState('注意要多起身活动活动');
  const [drinkingReminderMessage, setDrinkingReminderMessage] = useState('注意要多喝水');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState('');
  const [showSedentaryPresets, setShowSedentaryPresets] = useState(false);
  const [showDrinkingPresets, setShowDrinkingPresets] = useState(false);
  const [lastReminded, setLastReminded] = useState<{ [key: string]: number }>({});
  const [ipLocation, setIpLocation] = useState<any>(null);
  const [loadingIpLocation, setLoadingIpLocation] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressLatLng, setAddressLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<{ name: string; lat: number; lng: number; type: string; }[]>([]);
  const ipIntervalRef = useRef<any>(null);
  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);
  const [reminderModalContent, setReminderModalContent] = useState({ title: '', message: '' });
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const [mockCoords, setMockCoords] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const storedHeight = await AsyncStorage.getItem('height');
      if (storedHeight) {
        setHeight(storedHeight);
      }

      const storedWeight = await AsyncStorage.getItem('weight');
      if (storedWeight) {
        setWeight(storedWeight);
      }

      const days = await AsyncStorage.getItem('checkInDays');
      if (days) {
        setCheckInDays(parseInt(days));
      }
      const locations = await AsyncStorage.getItem('selectedLocations');
      if (locations) {
        setSelectedLocations(JSON.parse(locations));
      }
      const lastCheckInDate = await AsyncStorage.getItem('lastCheckInDate');
      const today = new Date().toDateString();
      if (lastCheckInDate === today) {
        setIsCheckedIn(true);
        const checkInTimeStr = await AsyncStorage.getItem('checkInTime');
        if (checkInTimeStr) {
          setCheckInTime(checkInTimeStr);
        }
      }
    };
    loadData();

    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '无法获取定位权限，请手动开启');
        return;
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, 
          distanceInterval: 5,
        },
        (location) => {
          const newCoords = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };
          setCurrentCoords(newCoords);
          const coordsToUse = mockCoords || newCoords;
          checkAllLocationProximity(coordsToUse.lat, coordsToUse.lng);
        }
      );
    };

    startLocationTracking();

    return () => {
      if (locationSubscription.current && typeof locationSubscription.current.remove === 'function') {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (currentCoords) {
        checkAllLocationProximity(currentCoords.lat, currentCoords.lng);
    }
  }, [selectedLocations, sedentaryReminderMessage, drinkingReminderMessage]);

  
  useEffect(() => {
    const logInterval = setInterval(() => {
      const coordsToLog = mockCoords || currentCoords;
      if (coordsToLog) {
        console.log(`[调试] 当前使用GPS: Lat=${coordsToLog.lat.toFixed(6)}, Lng=${coordsToLog.lng.toFixed(6)} (虚拟: ${!!mockCoords})`);
      } else {
        console.log('[调试] 正在等待获取GPS位置...');
      }
    }, 500);

    return () => {
      clearInterval(logInterval); 
    };
  }, [currentCoords, mockCoords]);

  useEffect(() => {
    (async () => {
      
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '无法获取通知权限，请手动开启');
      }
    })();
  }, []);

  const saveHeightWeight = async () => {
    if (height && weight) {
      try {
        await AsyncStorage.setItem('height', height);
        await AsyncStorage.setItem('weight', weight);

        Alert.alert(
          '成功',
          '身高体重数据已成功保存'
        );
      } catch (error) {
        console.error('数据提交失败:', error);
        Alert.alert('提示', '数据提交失败');
      }
    } else {
      Alert.alert('提示', '请输入身高和体重');
    }
  };

  const handleCheckIn = async () => {
    const lastCheckInDate = await AsyncStorage.getItem('lastCheckInDate');
    const today = new Date().toDateString();
    if (lastCheckInDate === today) {
      Alert.alert('提示', '你今天已经打卡过了');
    } else {
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      await AsyncStorage.setItem('lastCheckInDate', today);
      await AsyncStorage.setItem('checkInTime', timeString);
      const newCheckInDays = checkInDays + 1;
      await AsyncStorage.setItem('checkInDays', newCheckInDays.toString());
      setCheckInDays(newCheckInDays);
      setIsCheckedIn(true);
      setCheckInTime(timeString);
      Alert.alert('提示', `你已经坚持打卡 ${newCheckInDays} 天`);
    }
  };

  const getLocationSuggestions = async (input: string) => {
    if (input.trim() === '') {
      setSuggestedLocations([]);
      setIsSuggestionsVisible(false);
      return;
    }
    try {
      const response = await fetch(
        `https://apis.map.qq.com/ws/place/v1/suggestion/?keyword=${encodeURIComponent(input)}&key=${TENCENT_MAP_API_KEY}`
      );
      const data = await response.json();
      if (data.status === 0) {
        setSuggestedLocations(data.data);
        setIsSuggestionsVisible(true);
      } else {
        setSuggestedLocations([]);
        setIsSuggestionsVisible(false);
      }
    } catch (error) {
      console.error('获取地点建议失败:', error);
      setSuggestedLocations([]);
      setIsSuggestionsVisible(false);
    }
  };

  const promptLocationType = () => {
    return new Promise<string | null>((resolve) => {
      Alert.alert(
        '选择提醒类型',
        '请选择该地点的提醒类型',
        [
          {
            text: '久坐提醒',
            onPress: () => resolve('sedentary'),
          },
          {
            text: '饮水提醒',
            onPress: () => resolve('drinking'),
          },
          {
            text: '取消',
            onPress: () => resolve(null),
            style: 'cancel',
          },
        ],
        { cancelable: false }
      );
    });
  };

  const showReminderModal = (title: string, message: string) => {
    setReminderModalContent({ title, message });
    setIsReminderModalVisible(true);
  };

  const simulateArrivalAndTest = (location: any) => {
    if (location.type === 'unset' || !location.type) {
      Alert.alert('无法测试', '请先为该地点设置提醒类型（久坐或饮水）。');
      return;
    }

    const targetLat = location.lat;
    const targetLng = location.lng;
    
    console.log(`目标地点 "${location.name}" 的经纬度: lat=${targetLat}, lng=${targetLng}`);

    const radiusInMeters = Math.random() * 49; 
    const angle = Math.random() * 2 * Math.PI;
    
    const radiusInDegrees = radiusInMeters / 111320;

    const fakeLat = targetLat + radiusInDegrees * Math.cos(angle);
    const fakeLng = targetLng + radiusInDegrees * Math.sin(angle) / Math.cos(targetLat * Math.PI / 180);

    console.log(`位置模拟已启动，虚拟GPS: lat=${fakeLat}, lng=${fakeLng}`);
    setMockCoords({ lat: fakeLat, lng: fakeLng });
    checkAllLocationProximity(fakeLat, fakeLng); 

    setTimeout(() => {
      setMockCoords(null);
      console.log("位置模拟结束，已恢复真实GPS。");
    }, 10000); 
  };

  const checkAllLocationProximity = (userLat: number, userLng: number) => {
    const now = Date.now();
    selectedLocations.forEach((location) => {
      if (location.type === 'unset') return;

      const distance = calculateDistance(userLat, userLng, location.lat, location.lng);
      const key = `${location.name}_${location.type}`;
      if (distance < 50 && (!lastReminded[key] || now - lastReminded[key] > 10 * 60 * 1000)) {
        let message = '';
        let title = '';
        if (location.type === 'sedentary') {
          title = '久坐提醒';
          message = sedentaryReminderMessage;
        } else if (location.type === 'drinking') {
          title = '饮水提醒';
          message = drinkingReminderMessage;
        }
        
        if (title && message) {
          showReminderModal(title, message);
          sendNotification(message); 
          setLastReminded((prev) => ({ ...prev, [key]: now }));
        }
      }
    });
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; 
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const sendNotification = async (message: string) => {
    if (Platform.OS === 'web') {
      
      
      console.log('Web üzerinde bildirim simüle edildi:', message);
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '健康提醒',
        body: message,
        sound: 'default',
      },
      trigger: null,
    });
  };

  const deleteLocation = async (index: number) => {
    const updated = [...selectedLocations];
    updated.splice(index, 1);
    setSelectedLocations(updated);
    await AsyncStorage.setItem('selectedLocations', JSON.stringify(updated));
    Alert.alert('提示', '提醒地点已删除');
  };

  const fetchIpLocation = async () => {
    setLoadingIpLocation(true);
    try {
      const response = await fetch(
        'https://apis.map.qq.com/ws/location/v1/ip?key=X5MBZ-4M7WU-RAWVF-GVCZL-ADAKQ-D2FWN'
      );
      const data = await response.json();
      if (data.status === 0) {
        setIpLocation(data.result);
      } else {
        Alert.alert('定位失败', data.message || '未知错误');
        setIpLocation(null);
      }
    } catch (error) {
      Alert.alert('网络错误', '无法获取定位信息');
      setIpLocation(null);
    }
    setLoadingIpLocation(false);
  };

  
    useEffect(() => {
      
      fetchIpLocation();
      
      ipIntervalRef.current = setInterval(() => {
        fetchIpLocation();
      }, 120000); 

      
      return () => {
        if (ipIntervalRef.current) {
          clearInterval(ipIntervalRef.current);
        }
      };
    }, []);

  
  const fetchLatLngByAddress = async (address: string) => {
    const key = 'X5MBZ-4M7WU-RAWVF-GVCZL-ADAKQ-D2FWN';
    const url = `https://apis.map.qq.com/ws/geocoder/v1/?address=${encodeURIComponent(address)}&key=${key}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 0) {
        return data.result.location;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  };

  
  const checkAddressProximity = (userLat: number, userLng: number) => {
    if (addressLatLng) {
      const distance = calculateDistance(userLat, userLng, addressLatLng.lat, addressLatLng.lng);
      if (distance < 50) {
        Alert.alert('提醒', '你已进入设定地址的50米范围内');
      }
    }
  };

  const setLocationType = async (index: number, type: 'sedentary' | 'drinking') => {
    const updatedLocations = [...selectedLocations];
    updatedLocations[index].type = type;
    setSelectedLocations(updatedLocations);
    await AsyncStorage.setItem('selectedLocations', JSON.stringify(updatedLocations));
  };

  const selectLocation = async (location: any) => {
    setReminderLocationInput('');
    setIsSuggestionsVisible(false);
    
    const newLocation = {
      name: location.title,
      lat: location.location.lat,
      lng: location.location.lng,
      type: 'unset',
    };
    
    const updatedLocations = [...selectedLocations, newLocation];
    setSelectedLocations(updatedLocations);
    await AsyncStorage.setItem('selectedLocations', JSON.stringify(updatedLocations));
  };

  const renderReminderModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isReminderModalVisible}
      onRequestClose={() => setIsReminderModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{reminderModalContent.title}</Text>
          <Text style={styles.modalMessage}>{reminderModalContent.message}</Text>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setIsReminderModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>好的</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {renderReminderModal()}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>健康数据</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="身高"
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
          />
          <Text style={styles.unitText}>cm</Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="体重"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
          />
          <Text style={styles.unitText}>kg</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={saveHeightWeight}>
          <Text style={styles.buttonText}>保存</Text>
        </TouchableOpacity>
      </View>

      {/* 新增：IP定位显示 */}
      <View style={styles.section}>
        <Text style={styles.label}>IP定位（市级）</Text>
        {loadingIpLocation && <ActivityIndicator size="small" color="#4CAF50" />}
        {ipLocation && (
          <View style={{ marginTop: 10 }}>
            <Text>IP: {ipLocation.ip}</Text>
            <Text>经度: {ipLocation.location.lng}</Text>
            <Text>纬度: {ipLocation.location.lat}</Text>
            <Text>省份: {ipLocation.ad_info.province}</Text>
            <Text>城市: {ipLocation.ad_info.city}</Text>
            <Text>区县: {ipLocation.ad_info.district}</Text>
          </View>
        )}
      </View>

      {/* 提醒地点设置 */}
      <View style={styles.section}>
        <Text style={styles.label}>设置提醒地点</Text>
        <TextInput
          style={styles.input}
          value={reminderLocationInput}
          onChangeText={(text) => {
            setReminderLocationInput(text);
            getLocationSuggestions(text);
          }}
          placeholder="输入地点名称"
        />
        {isSuggestionsVisible && (
          <View style={styles.suggestionsContainer}>
            {suggestedLocations.map((location, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => selectLocation(location)}
              >
                <Text>{location.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* 显示已设置的提醒地点及经纬度 */}
      <View style={styles.section}>
        <Text style={styles.label}>已设置的提醒地点</Text>
        {selectedLocations.length > 0 ? (
          selectedLocations.map((location, index) => (
            <View key={index} style={styles.locationItem}>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{location.name}</Text>
                {location.type === 'unset' || !location.type ? (
                  <View style={styles.typeSelectionContainer}>
                    <TouchableOpacity style={[styles.typeButton, styles.sedentaryButton]} onPress={() => setLocationType(index, 'sedentary')}>
                      <Text style={styles.typeButtonText}>设为久坐</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.typeButton, styles.drinkingButton]} onPress={() => setLocationType(index, 'drinking')}>
                      <Text style={styles.typeButtonText}>设为饮水</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.locationCoords}>
                    类型: {location.type === 'sedentary' ? '久坐提醒' : '饮水提醒'}
                  </Text>
                )}
              </View>
              <View style={styles.locationActions}>
                <TouchableOpacity style={styles.testButton} onPress={() => simulateArrivalAndTest(location)}>
                  <Text style={styles.testButtonText}>测试</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteLocation(index)}>
                  <Text style={styles.deleteButton}>删除</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyListText}>暂无提醒地点</Text>
        )}
      </View>

      {/* 久坐提醒自定义语句 */}
      <View style={styles.section}>
        <Text style={styles.label}>久坐提醒语句</Text>
        <TextInput
          style={styles.input}
          value={sedentaryReminderMessage}
          onChangeText={setSedentaryReminderMessage}
          placeholder="输入久坐提醒语句"
          onFocus={() => {
            setShowSedentaryPresets(true);
            setShowDrinkingPresets(false);
          }}
        />
        {showSedentaryPresets && (
          <View style={styles.presetContainer}>
            <FlatList
              data={SEDENTARY_PRESET_MESSAGES}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.presetItem}
                  onPress={() => {
                    setSedentaryReminderMessage(item);
                    setShowSedentaryPresets(false);
                  }}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* 饮水提醒自定义语句 */}
      <View style={styles.section}>
        <Text style={styles.label}>饮水提醒语句</Text>
        <TextInput
          style={styles.input}
          value={drinkingReminderMessage}
          onChangeText={setDrinkingReminderMessage}
          placeholder="输入饮水提醒语句"
          onFocus={() => {
            setShowDrinkingPresets(true);
            setShowSedentaryPresets(false);
          }}
        />
        {showDrinkingPresets && (
          <View style={styles.presetContainer}>
            <FlatList
              data={DRINKING_PRESET_MESSAGES}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.presetItem}
                  onPress={() => {
                    setDrinkingReminderMessage(item);
                    setShowDrinkingPresets(false);
                  }}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* 打卡环形 */}
      <View style={styles.checkInContainer}>
        <Svg width={CIRCLE_RADIUS * 2 + 20} height={CIRCLE_RADIUS * 2 + 20}>
          {/* 背景圆 */}
          <Circle
            cx={CIRCLE_RADIUS + 10}
            cy={CIRCLE_RADIUS + 10}
            r={CIRCLE_RADIUS}
            stroke="#e0e0e0"
            strokeWidth={10}
            fill="none"
          />
          {/* 进度圆 */}
          <Circle
            cx={CIRCLE_RADIUS + 10}
            cy={CIRCLE_RADIUS + 10}
            r={CIRCLE_RADIUS}
            stroke={isCheckedIn ? '#4CAF50' : '#999'}
            strokeWidth={10}
            fill="none"
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeDashoffset={0}
            strokeLinecap="round"
          />
        </Svg>
        <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
          <Text style={styles.checkInText}>
            {isCheckedIn ? `已打卡\n时间: ${checkInTime}\n已打卡 ${checkInDays} 天` : '点击打卡'}
          </Text>
        </TouchableOpacity>
      </View>
      {/* 底部导航 */}
      <BottomNavBar currentPage="Me" />
    </ScrollView>
  );
};

const NAVIGATION_HEIGHT = 65; 

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA', 
  },
  contentContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    paddingBottom: 100, 
  },
  
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#171717',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C', 
    marginBottom: 16,
  },
  
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#2D3748',
  },
  unitText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#718096', 
    paddingRight: 16,
  },
  
  button: {
    backgroundColor: '#3182CE', 
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  locationInfo: {
    flex: 1,
    marginRight: 10,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  locationCoords: {
    fontSize: 13,
    color: '#A0AEC0',
    marginTop: 4,
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    marginLeft: 16,
  },
  testButton: {
    backgroundColor: '#EBF4FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  testButtonText: {
    color: '#3182CE',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyListText: {
    textAlign: 'center',
    color: '#A0AEC0',
    paddingVertical: 20,
  },
  
  typeSelectionContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  typeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
  },
  sedentaryButton: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F6E05E',
  },
  drinkingButton: {
    backgroundColor: '#EBF8FF',
    borderColor: '#90CDF4',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sedentaryButtonText: {
    color: '#D69E2E'
  },
  drinkingButtonText: {
    color: '#2C5282'
  },
  
  checkInContainer: {
    alignItems: 'center',
    marginVertical: 24,
    position: 'relative',
  },
  checkInButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#2D3748',
    fontWeight: '700',
  },
  checkInTimeText: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1A202C',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#4A5568',
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: '#3182CE',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    marginTop: 8,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingVertical: 10,
    paddingHorizontal: 15,

  },
  navButton: {
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#4ECDC4',
  },
  presetContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 150,
  },
  presetItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default Me;