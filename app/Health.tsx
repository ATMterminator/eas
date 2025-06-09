import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import BottomNavBar from './components/BottomNavBar';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function Health() {
    const router = useRouter();
    const [lastDrinkTime, setLastDrinkTime] = useState<number | null>(null);
    const [lastSleepTime, setLastSleepTime] = useState<number | null>(null);
    const [drinkAmount, setDrinkAmount] = useState(0);
    const [sleepHours, setSleepHours] = useState(0);
    const [healthScore, setHealthScore] = useState(0);

    const loadData = React.useCallback(async () => {
        const today = new Date();
        const todayDateString = today.toDateString();

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayDateString = yesterday.toDateString();

        
        const drinkAmountStr = await AsyncStorage.getItem(`dailyDrinkAmount_${todayDateString}`);
        const currentDrinkAmount = drinkAmountStr ? parseInt(drinkAmountStr, 10) : 0;
        setDrinkAmount(currentDrinkAmount);
        
        const lastDrink = await AsyncStorage.getItem('lastDrinkTime');
        if (lastDrink) setLastDrinkTime(parseFloat(lastDrink));

        
        const sleepHoursStr = await AsyncStorage.getItem(`sleepHours_${yesterdayDateString}`);
        const currentSleepHours = sleepHoursStr ? parseFloat(sleepHoursStr) : 0;
        setSleepHours(currentSleepHours);
        
        const lastSleep = await AsyncStorage.getItem('lastSleepTime');
        if (lastSleep) setLastSleepTime(parseFloat(lastSleep));
        
        
        await calculateHealthScore(currentDrinkAmount, currentSleepHours);
    }, []);
    
    
    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [loadData])
    );
    
    
    useEffect(() => {
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const timeUntilMidnight = midnight.getTime() - now.getTime();

        const timer = setTimeout(() => {
            
            loadData(); 
        }, timeUntilMidnight);

        return () => clearTimeout(timer);
    }, [loadData]);

    const calculateHealthScore = async (currentDrinkAmount: number, currentSleepHours: number) => {
        
        const weightData = await AsyncStorage.getItem('weight');
        const weight = weightData ? parseFloat(weightData) : 60;

        
        const today = new Date().toDateString();
        const exerciseDataStr = await AsyncStorage.getItem(`exercise_${today}`);
        const exerciseData = exerciseDataStr ? JSON.parse(exerciseDataStr) : [];
        
        
        const totalCalories = exerciseData.reduce((sum: any, data: { calories: any; }) => sum + data.calories, 0);
        
        
        const exerciseScore = Math.min(totalCalories / (5 * weight * 0.83 * 1.05), 1) * 0.4;
        
        
        const drinkScore = Math.min(currentDrinkAmount / 2000, 1) * 0.3;
        
        
        const sleepScore = Math.min(currentSleepHours / 8, 1) * 0.3;
        
        
        const totalScore = exerciseScore + drinkScore + sleepScore;
        setHealthScore(totalScore);
    };

    const getTimeSinceLastDrink = () => {
        if (lastDrinkTime) {
            const now = Date.now();
            const diff = now - lastDrinkTime;
            return Math.floor(diff / (1000 * 60));
        }
        return '无记录';
    };

    const getDrinkBarIndex = () => {
        const ratio = drinkAmount / 1600;
        if (ratio < 0.1) return 0;
        if (ratio < 0.2) return 1;
        if (ratio < 0.3) return 2;
        if (ratio < 0.4) return 3;
        if (ratio < 0.5) return 4;
        if (ratio < 0.6) return 5;
        if (ratio < 0.7) return 6;
        if (ratio < 0.8) return 7;
        if (ratio < 0.9) return 8;
        return 9;
    };

    const getSleepBarIndex = () => {
        const ratio = sleepHours / 10;
        if (ratio < 0.1) return 0;
        if (ratio < 0.2) return 1;
        if (ratio < 0.3) return 2;
        if (ratio < 0.4) return 3;
        if (ratio < 0.5) return 4;
        if (ratio < 0.6) return 5;
        if (ratio < 0.7) return 6;
        if (ratio < 0.8) return 7;
        if (ratio < 0.9) return 8;
        return 9;
    };

    const getHealthStatus = () => {
        if (healthScore < 0.6) return { color: '#999', text: '不及格' };
        if (healthScore < 0.7) return { color: '#FFD700', text: '合格' };
        if (healthScore < 0.8) return { color: '#FFA500', text: '良好' };
        return { color: '#4CAF50', text: '优秀' };
    };

    const healthStatus = getHealthStatus();

    const clearData = async () => {
        const today = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayDateString = yesterday.toDateString();

        
        await AsyncStorage.setItem(`dailyDrinkAmount_${today}`, '0');
        await AsyncStorage.setItem(`sleepHours_${yesterdayDateString}`, '0');
        
        
        await AsyncStorage.removeItem('lastDrinkTime');
        await AsyncStorage.removeItem('lastSleepTime');

        
        await loadData();
    };

    return (
        <View style={styles.outerContainer}>
            <ScrollView style={styles.container}>
                <View style={styles.contentWrapper}>
                    <TouchableOpacity
                        style={styles.module}
                        onPress={() => router.push({ pathname: "./Drink_DataInput" })}
                    >
                        <View style={styles.moduleHeader}>
                            <MaterialIcons name="local-drink" size={24} color="#3182CE" style={styles.moduleIcon} />
                            <Text style={styles.moduleTitle}>饮水量</Text>
                        </View>
                        <Text style={styles.moduleContent}>
                            今日已饮水{drinkAmount}ml，已有 {getTimeSinceLastDrink()} 分钟未喝水
                        </Text>
                        <View style={styles.segmentedBarContainer}>
                            {Array.from({ length: 10 }).map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.barSegment,
                                        index < getDrinkBarIndex() && styles.filledBarSegment
                                    ]}
                                />
                            ))}
                        </View>
                        <View style={styles.barLabels}>
                             <Text style={styles.barLabelText}>建议2000ml</Text>
                             <Text style={styles.barLabelText}>{drinkAmount}ml</Text>
                        </View>
                    </TouchableOpacity>
            
                    <TouchableOpacity
                        style={styles.module}
                        onPress={() => router.push({ pathname: "./Sleep_DataInput" })}
                    >
                        <View style={styles.moduleHeader}>
                            <MaterialIcons name="bed" size={24} color="#5A67D8" style={styles.moduleIcon} />
                            <Text style={styles.moduleTitle}>睡眠</Text>
                        </View>
                        <Text style={styles.moduleContent}>昨晚睡了 {sleepHours} 小时</Text>
                        <View style={styles.segmentedBarContainer}>
                            {Array.from({ length: 10 }).map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.barSegment,
                                        { backgroundColor: '#EBEFFF' }, 
                                        index < getSleepBarIndex() && styles.filledSleepBarSegment
                                    ]}
                                />
                            ))}
                        </View>
                         <View style={styles.barLabels}>
                             <Text style={styles.barLabelText}>建议8h</Text>
                             <Text style={styles.barLabelText}>{sleepHours.toFixed(1)}h</Text>
                        </View>
                    </TouchableOpacity>
            
                    <View style={styles.module}>
                        <View style={styles.moduleHeader}>
                            <MaterialIcons name="favorite" size={24} color="#E53E3E" style={styles.moduleIcon} />
                            <Text style={styles.moduleTitle}>健康评分</Text>
                        </View>
                        <View style={styles.healthScoreContainer}>
                            <Svg width={180} height={180}>
                                <Defs>
                                    <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                                        <Stop offset="0%" stopColor={healthStatus.color} stopOpacity="1" />
                                        <Stop offset="100%" stopColor="#E53E3E" stopOpacity="0.8" />
                                    </LinearGradient>
                                </Defs>
                                <Circle cx={90} cy={90} r={80} stroke="#E2E8F0" strokeWidth={15} fill="none" />
                                <Circle
                                    cx={90}
                                    cy={90}
                                    r={80}
                                    stroke="url(#grad)"
                                    strokeWidth={15}
                                    fill="none"
                                    strokeDasharray={2 * Math.PI * 80}
                                    strokeDashoffset={(2 * Math.PI * 80) * (1 - healthScore)}
                                    strokeLinecap="round"
                                    transform={`rotate(-90 90 90)`}
                                />
                            </Svg>
                            <View style={styles.healthScoreTextWrapper}>
                                <Text style={[styles.healthScoreValue, { color: healthStatus.color }]}>
                                    {healthStatus.text}
                                </Text>
                            </View>
                        </View>
                    </View>
            
                    <TouchableOpacity style={styles.clearButton} onPress={clearData}>
                         <MaterialIcons name="delete-sweep" size={20} color="#DC2626" />
                        <Text style={styles.clearButtonText}>清空今日数据</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <BottomNavBar currentPage="Health" />
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },
    container: {
        flex: 1,
    },
    contentWrapper: {
        padding: isWeb ? 20 : 16,
        maxWidth: 768, 
        width: '100%',
        alignSelf: 'center', 
        paddingBottom: 80, 
    },
    module: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#171717',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 5,
        elevation: 3,
    },
    moduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    moduleIcon: {
        marginRight: 12,
    },
    moduleTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A202C',
    },
    moduleContent: {
        fontSize: 14,
        color: '#4A5568',
        lineHeight: 20,
        marginBottom: 16,
    },
    
    segmentedBarContainer: {
        flexDirection: 'row',
        height: 10,
        borderRadius: 5,
        overflow: 'hidden',
    },
    barSegment: {
        flex: 1,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 1.5,
        borderRadius: 5,
    },
    filledBarSegment: {
        backgroundColor: '#3182CE',
    },
    filledSleepBarSegment: {
        backgroundColor: '#5A67D8',
    },
    barLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    barLabelText: {
        fontSize: 12,
        color: '#718096',
        fontWeight: '500',
    },
    
    healthScoreContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    healthScoreTextWrapper: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    healthScoreValue: {
        fontSize: 38,
        fontWeight: 'bold',
    },
    
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        paddingVertical: 14,
        marginTop: 10,
    },
    clearButtonText: {
        color: '#DC2626',
        fontWeight: '700',
        fontSize: 16,
        marginLeft: 8,
    },
});