import * as React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarChart, LineChart } from 'react-native-chart-kit';
import BottomNavBar from './components/BottomNavBar';

const { width } = Dimensions.get('window');

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

const Chart = () => {
  const router = useRouter();
  const [drinkData, setDrinkData] = useState<ChartData>({
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
  });
  const [sleepData, setSleepData] = useState<ChartData>({
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
  });
  const [stepsData, setStepsData] = useState<ChartData>({
    labels: Array.from({ length: 30 }, (_, i) => `${i + 1}`),
    datasets: [{ data: Array(30).fill(0) }]
  });

  const [hoveredStepValue, setHoveredStepValue] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadChartData();
    }, [])
  );

  const getPastSevenDays = () => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const labels = [];
    const dateKeys = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(days[d.getDay()]);
      dateKeys.push(d.toDateString());
    }
    return { labels, dateKeys };
  };

  const loadChartData = async () => {
    await loadWeeklyDrinkData();
    await loadWeeklySleepData();
    await loadMonthlyStepsData();
  };

  const loadWeeklyDrinkData = async () => {
    try {
      const { labels, dateKeys } = getPastSevenDays();
      const drinkAmounts = await Promise.all(
        dateKeys.map(async (key) => {
          const drinkAmount = await AsyncStorage.getItem(`dailyDrinkAmount_${key}`);
          return drinkAmount ? parseInt(drinkAmount) : 0;
        })
      );

      setDrinkData({
        labels,
        datasets: [{ data: drinkAmounts }]
      });
    } catch (error) {
      console.error('加载饮水数据失败:', error);
    }
  };

  const loadWeeklySleepData = async () => {
    try {
      const { labels, dateKeys } = getPastSevenDays();
      const sleepHours = await Promise.all(
        dateKeys.map(async (key) => {
          const sleepHour = await AsyncStorage.getItem(`sleepHours_${key}`);
          return sleepHour ? parseFloat(sleepHour) : 0;
        })
      );

      setSleepData({
        labels,
        datasets: [{ data: sleepHours }]
      });
    } catch (error) {
      console.error('加载睡眠数据失败:', error);
    }
  };

  const loadMonthlyStepsData = async () => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const monthDateKeys = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        return `${year}-${month + 1}-${day}`;
      });

      const steps = await Promise.all(
        monthDateKeys.map(async (key) => {
          const step = await AsyncStorage.getItem(`steps_${key}`);
          return step ? parseInt(step) : 0;
        })
      );

      const labels = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        if (day === 1 || day % 5 === 0) {
          return `${day}`;
        }
        return '';
      });

      setStepsData({
        labels: labels,
        datasets: [{ data: steps }]
      });
    } catch (error) {
      console.error('加载步数数据失败:', error);
    }
  };

  const handleStepsDataPoint = (data: any, index: number) => {
    setHoveredStepValue(`${stepsData.labels[index]}: ${stepsData.datasets[0].data[index]} 步`);
  };

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(49, 130, 206, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(113, 128, 150, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#3182CE',
    },
  };

  const drinkChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(71, 136, 214, ${opacity})`
  };

  const sleepChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(105, 201, 140, ${opacity})`
  };

  const stepsChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(225, 95, 85, ${opacity})`
  };

  return (
    <ScrollView style={styles.container}>
      {/* 周饮水柱状图 */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>本周饮水量 (ml)</Text>
        <BarChart
          data={drinkData}
          width={width - 40}
          height={220}
          chartConfig={drinkChartConfig}
          yAxisLabel=""
          yAxisSuffix="ml"
          fromZero={true}
          showValuesOnTopOfBars={true}
          style={styles.chart}
        />
      </View>

      {/* 周睡眠柱状图 */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>本周睡眠时间 (小时)</Text>
        <BarChart
          data={sleepData}
          width={width - 40}
          height={220}
          chartConfig={sleepChartConfig}
          yAxisLabel=""
          yAxisSuffix="h"
          fromZero={true}
          showValuesOnTopOfBars={true}
          style={styles.chart}
        />
      </View>

      {/* 月步数折线图 */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>本月步数</Text>
        {hoveredStepValue && (
          <View style={styles.tooltipContainer}>
            <Text style={styles.tooltipText}>{hoveredStepValue}</Text>
          </View>
        )}
        <LineChart
          data={stepsData}
          width={width - 40}
          height={220}
          chartConfig={stepsChartConfig}
          yAxisLabel=""
          yAxisSuffix=" 步"
          bezier
          style={styles.chart}
          onDataPointClick={({ value, dataset, getColor, index }) => handleStepsDataPoint(dataset, index)}
        />
      </View>

      {/* 底部导航 */}
      <BottomNavBar currentPage="Chart" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20
  },
  chartContainer: {
    marginBottom: 30
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  tooltipContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 5,
    marginBottom: 10,
    alignSelf: 'center'
  },
  tooltipText: {
    color: '#fff',
    fontSize: 14
  },
});

export default Chart;