import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { MaterialIcons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 80; // Account for Y-axis labels

const ExposureChart = ({ 
  title, 
  data, 
  color, 
  icon, 
  unit = '', 
  showCumulative = true,
  height = 200 
}) => {
  if (!data || !data.labels || data.labels.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialIcons name={icon} size={20} color={color} />
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>
        <View style={styles.noData}>
          <MaterialIcons name="data-usage" size={40} color="#E0E0E0" />
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      </View>
    );
  }

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: showCumulative ? data.cumulative : data.values,
        color: (opacity = 1) => color,
        strokeWidth: 2.5
      }
    ]
  };

  const chartConfig = {
    backgroundColor: '#FAFAFA',
    backgroundGradientFrom: '#FAFAFA',
    backgroundGradientTo: '#FAFAFA',
    decimalPlaces: 0,
    color: (opacity = 1) => color,
    labelColor: (opacity = 1) => '#9E9E9E',
    style: {
      borderRadius: 12
    },
    propsForDots: {
      r: '3',
      strokeWidth: '2',
      stroke: color,
      fill: '#FFFFFF'
    },
    propsForBackgroundLines: {
      strokeDasharray: '3, 3',
      stroke: '#F0F0F0',
      strokeWidth: 1
    },
    propsForLabels: {
      fontSize: 11,
      rotation: 0,
    },
    propsForVerticalLabels: {
      fontSize: 11,
      rotation: 0,
    },
    propsForHorizontalLabels: {
      fontSize: 11,
    }
  };

  const getCurrentValue = () => {
    if (showCumulative && data.cumulative) {
      return data.cumulative[data.cumulative.length - 1] || 0;
    }
    return data.values ? data.values[data.values.length - 1] || 0 : 0;
  };

  const currentValue = getCurrentValue();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <MaterialIcons name={icon} size={20} color={color} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.valueContainer}>
          <Text style={[styles.value, { color }]}>
            {currentValue.toFixed(0)}
          </Text>
          <Text style={styles.unit}>{unit}</Text>
        </View>
      </View>
      
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={height}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withDots={true}
          withShadow={false}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={true}
          segments={5}
          yAxisSuffix=""
          yAxisInterval={1}
        />
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {showCumulative ? 'Cumulative exposure over time' : 'Current values over time'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginVertical: 16,
    marginHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#424242',
    marginLeft: 10,
    flex: 1,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  unit: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
  },
  chart: {
    borderRadius: 12,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  footerText: {
    fontSize: 13,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  noData: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    marginVertical: 12,
  },
  noDataText: {
    fontSize: 15,
    color: '#9E9E9E',
    marginTop: 12,
    fontWeight: '500',
  },
});

export default ExposureChart;
