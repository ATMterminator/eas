import * as React from 'react';
import { useState } from 'react';
import {
    Text,
    View,
    StyleSheet,
    Button,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

export default function SleepDataInput() {
    const router = useRouter();
    const [sleepHours, setSleepHours] = useState('');

    const sleepTips = [
        "尽量在晚上11点前入睡，以保证充足的深度睡眠。",
        "睡前避免使用电子设备，因为屏幕发出的蓝光会抑制褪黑素的分泌。",
        "睡前可以泡个热水澡或喝一杯温牛奶，有助于放松身心。",
        "保持卧室安静、黑暗和凉爽的环境，有利于提高睡眠质量。",
        "最好一次睡眠时长在7 - 9小时，以满足身体的恢复需求。"
    ];

    const handleSubmit = async () => {
        if (!sleepHours || isNaN(parseFloat(sleepHours))) {
            alert('请输入有效的睡眠时间');
            return;
        }

        try {
            const hours = parseFloat(sleepHours);
            const now = new Date();
            
            // Sleep data is for the previous night
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const yesterdayDateString = yesterday.toDateString();
            
            // Save last sleep time for the main page info
            await AsyncStorage.setItem('lastSleepTime', now.getTime().toString());
            
            // SINGLE SOURCE OF TRUTH: Only save data with a date-specific key
            await AsyncStorage.setItem(`sleepHours_${yesterdayDateString}`, hours.toString());
            
            Alert.alert('保存成功', `已记录 ${hours} 小时睡眠`, [
                { text: '确定', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('保存睡眠数据失败:', error);
            alert('保存失败，请重试');
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>记录睡眠时间</Text>
            </View>
            
            <View style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>昨晚睡了多久 (小时):</Text>
                    <View style={styles.customInputContainer}>
                        <TextInput
                            style={styles.input}
                            value={sleepHours}
                            onChangeText={setSleepHours}
                            placeholder="例如: 7.5"
                            keyboardType="numeric"
                        />
                        <Text style={styles.unitText}>小时</Text>
                    </View>
                </View>
                
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>快速选择:</Text>
                    <View style={styles.presetContainer}>
                        <TouchableOpacity 
                            style={styles.presetButton}
                            onPress={() => setSleepHours('6')}
                        >
                            <Text style={styles.presetButtonText}>6小时</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.presetButton}
                            onPress={() => setSleepHours('7')}
                        >
                            <Text style={styles.presetButtonText}>7小时</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.presetButton}
                            onPress={() => setSleepHours('8')}
                        >
                            <Text style={styles.presetButtonText}>8小时</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                
                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                >
                    <Text style={styles.submitButtonText}>提交</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                
                {/* 睡眠小提示部分 */}
                <View style={styles.tipBox}>
                    <Text style={styles.tipText}>
                        贴心提示：成年人建议每晚保持7-9小时的充足睡眠，有助于身体恢复和认知功能。
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
        backgroundColor: '#5A67D8', // A calming indigo for sleep
        paddingVertical: 20,
        paddingHorizontal: 20,
        paddingTop: 50, // For status bar
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: 'white',
        textAlign: 'center',
    },
    content: {
        padding: 20,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#171717',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A202C',
        marginBottom: 16,
    },
    // Custom input
    customInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7F8FA',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 18,
        color: '#2D3748',
    },
    unitText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#718096',
    },
    // Quick add buttons
    presetContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        marginTop: 8,
    },
    presetButton: {
        backgroundColor: '#EBEFFF',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        margin: 6,
    },
    presetButtonText: {
        color: '#4C51BF',
        fontWeight: '700',
        fontSize: 14,
    },
    // Submit button
    submitButton: {
        backgroundColor: '#5A67D8',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 18,
    },
    // Tip section
    tipBox: {
        backgroundColor: '#EBEFFF',
        borderColor: '#C3DAFE',
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
    },
    tipText: {
        color: '#434190',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center'
    },
    cancelButtonText: {
        color: '#333',
        fontSize: 18
    }
});