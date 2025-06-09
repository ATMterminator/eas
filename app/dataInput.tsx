import React, { useState } from 'react';
import { Text, TextInput, Button, View } from 'react-native';
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

const DataInput = () => {
  const [sleepTime, setSleepTime] = useState<string>('');
  const [drinkCount, setDrinkCount] = useState<string>('');
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      const healthData = {
        sleep_time: sleepTime,
        drink_count: parseInt(drinkCount)
      };

      const existingDataString = await AsyncStorage.getItem('health_data');
      let existingData = existingDataString ? JSON.parse(existingDataString) : [];
      existingData.push(healthData);

      await AsyncStorage.setItem('health_data', JSON.stringify(existingData));
      
      console.log('数据提交成功');
      router.back(); 
    } catch (error) {
      console.error('数据提交失败:', error);
    }
  };

  return (
    <View>
      <Text>睡眠时间:</Text>
      <TextInput
        value={sleepTime}
        onChangeText={(text: string) => setSleepTime(text)}
        placeholder="请输入睡眠时间"
      />
      <Text>饮水次数:</Text>
      <TextInput
        value={drinkCount}
        onChangeText={(text: string) => setDrinkCount(text)}
        placeholder="请输入饮水次数"
      />
      <Button title="提交" onPress={handleSubmit} />
    </View>
  );
};

export default DataInput;