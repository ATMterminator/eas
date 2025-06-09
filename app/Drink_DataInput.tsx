import * as React from 'react';
import { useState, useEffect } from 'react';
import {
    Text,
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';


const cupImages: { [key: number]: any } = {
    50: require('../assets/images/cup_50ml.png'),
    100: require('../assets/images/cup_100ml.png'),
    150: require('../assets/images/cup_150ml.png'),
    200: require('../assets/images/cup_200ml.png'),
    300: require('../assets/images/cup_300ml.png')
};


const containerReferences = [
    { name: '小茶杯', volume: 150, image: require('../assets/images/cup_150ml.png') },
    { name: '普通水杯', volume: 250, image: require('../assets/images/cup_200ml.png') },
    { name: '矿泉水瓶', volume: 500, image: require('../assets/images/cup_500ml.png') },
    { name: '运动水壶', volume: 750, image: require('../assets/images/cup_750ml.png') }
];

export default function DrinkDataInput() {
    const router = useRouter();
    const [drinkAmount, setDrinkAmount] = useState('');
    const [selectedContainer, setSelectedContainer] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [todayTotal, setTodayTotal] = useState(0);

    useFocusEffect(
        React.useCallback(() => {
            const loadTodayDrinkAmount = async () => {
                try {
                    const todayDateString = new Date().toDateString();
                    const amountStr = await AsyncStorage.getItem(`dailyDrinkAmount_${todayDateString}`);
                    setTodayTotal(amountStr ? parseInt(amountStr, 10) : 0);
                } catch (error) {
                    console.error('加载饮水数据失败:', error);
                    Alert.alert('错误', '加载数据失败');
                }
            };
            loadTodayDrinkAmount();
        }, [])
    );

    const showToast = (message: string) => {
        Alert.alert('提示', message);
    };

    const handleSubmit = async () => {
        const amount = parseInt(drinkAmount, 10);
        if (!drinkAmount || isNaN(amount) || amount <= 0) {
            Alert.alert('提示', '请输入有效的饮水量');
            return;
        }

        setIsSubmitting(true);
        try {
            const today = new Date();
            const todayDateString = today.toDateString();
            
            
            await AsyncStorage.setItem('lastDrinkTime', today.getTime().toString());

            
            const currentAmountStr = await AsyncStorage.getItem(`dailyDrinkAmount_${todayDateString}`) || '0';
            const newAmount = parseInt(currentAmountStr, 10) + amount;
            
            
            await AsyncStorage.setItem(`dailyDrinkAmount_${todayDateString}`, newAmount.toString());

            Alert.alert(
                '保存成功',
                `已记录 ${amount}ml，今日总饮水量: ${newAmount}ml`,
                [{ text: '确定', onPress: () => router.back() }]
            );
        } catch (error) {
            console.error('保存饮水数据失败:', error);
            Alert.alert('提示', '保存失败，请重试');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectContainer = (volume: number) => {
        setDrinkAmount(volume.toString());
        setSelectedContainer(volume);
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                 <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>记录饮水</Text>
                <View style={{ width: 40 }} /> 
            </View>
            
            <View style={styles.content}>
                <View style={styles.todayTotalContainer}>
                    <Text style={styles.todayTotalLabel}>今日已饮水</Text>
                    <Text style={styles.todayTotalValue}>{todayTotal} ml</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>快速选择</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {containerReferences.map((container) => (
                            <TouchableOpacity 
                                key={container.name} 
                                style={[
                                    styles.containerButton,
                                    selectedContainer === container.volume && styles.selectedContainer
                                ]}
                                onPress={() => selectContainer(container.volume)}
                            >
                                <Image source={container.image} style={styles.containerImage} />
                                <Text style={styles.containerText}>{container.name}</Text>
                                <Text style={styles.containerVolume}>{container.volume}ml</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>自定义或修改</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={drinkAmount}
                            onChangeText={setDrinkAmount}
                            placeholder="0"
                            placeholderTextColor="#A0AEC0"
                            keyboardType="numeric"
                        />
                        <Text style={styles.unitText}>ml</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, (!drinkAmount || isSubmitting) && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={!drinkAmount || isSubmitting}
                >
                    {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>确认添加</Text>}
                </TouchableOpacity>
                 <View style={styles.tipBox}>
                    <MaterialIcons name="info-outline" size={20} color="#2A4365" />
                    <Text style={styles.tipText}>
                        成年人建议每日饮水量为1500-1700毫升。
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#3182CE',
        paddingVertical: 15,
        paddingHorizontal: 15,
        paddingTop: 45, 
    },
    backButton: {
        padding: 5,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: 'white',
    },
    content: {
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    todayTotalContainer: {
        backgroundColor: '#EBF4FF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    todayTotalLabel: {
        fontSize: 14,
        color: '#4A5568',
        fontWeight: '500',
    },
    todayTotalValue: {
        fontSize: 32,
        fontWeight: '700',
        color: '#2C5282',
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A202C',
        marginBottom: 12,
    },
    containerButton: {
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: 'white',
        marginRight: 12,
        minWidth: 100,
    },
    selectedContainer: {
        borderColor: '#3182CE',
        backgroundColor: 'white',
        shadowColor: '#3182CE',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    containerImage: {
        width: 40,
        height: 60,
        resizeMode: 'contain',
        marginBottom: 8,
    },
    containerText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2D3748',
    },
    containerVolume: {
        fontSize: 12,
        color: '#718096',
        marginTop: 2,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 22,
        fontWeight: '600',
        color: '#2D3748',
    },
    unitText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#718096',
    },
    submitButton: {
        backgroundColor: '#3182CE',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    disabledButton: {
        backgroundColor: '#A0AEC0',
    },
    submitButtonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
    tipBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EBF8FF',
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
    },
    tipText: {
        color: '#2A4365',
        fontSize: 13,
        lineHeight: 18,
        marginLeft: 8,
    },
});