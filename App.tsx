import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  AppState,
  AppStateStatus,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import Slider from '@react-native-community/slider';
import LinearGradient from 'react-native-linear-gradient';

const LOAN_MIN = 10000;
const LOAN_MAX = 50000;
const TENURES = [3, 6, 9];
const ANNUAL_RATE = 29.95; // p.a.
const MONTHLY_RATE = ANNUAL_RATE / 12 / 100; // per month

function calculateEMI(P: number, N: number, R: number): number {
  const numerator = P * R * Math.pow(1 + R, N);
  const denominator = Math.pow(1 + R, N) - 1;
  return denominator === 0 ? 0 : Math.round(numerator / denominator);
}

function calculateTotal(EMI: number, N: number): number {
  return EMI * N;
}

const App = () => {
  const [loanAmount, setLoanAmount] = useState(20000);
  const [selectedTenure, setSelectedTenure] = useState(3);

  // 1-hour timer
  const [timer, setTimer] = useState(3600); // seconds
  const expiryRef = useRef<number>(Date.now() + 3600 * 1000); // 1 hour from now
  const intervalRef = useRef<number | null>(null);

  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const appStateRef = useRef<AppStateStatus>(appState);

  // Timer logic
  useEffect(() => {
    expiryRef.current = Date.now() + 3600 * 1000;
    setTimer(3600);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const prev = appStateRef.current;
      if (prev && prev.match(/inactive|background/) && nextAppState === 'active') {
        const remaining = Math.max(Math.ceil((expiryRef.current - Date.now()) / 1000), 0);
        setTimer(remaining);
        if (!intervalRef.current && remaining > 0) {
          intervalRef.current = setInterval(() => {
            const remainingInner = Math.max(Math.ceil((expiryRef.current - Date.now()) / 1000), 0);
            setTimer(remainingInner);
            if (remainingInner === 0 && intervalRef.current) {
              clearInterval(intervalRef.current as any);
              intervalRef.current = null;
            }
          }, 500) as unknown as number;
        }
      }

      if (nextAppState === 'background') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current as any);
          intervalRef.current = null;
        }
      }

      appStateRef.current = nextAppState;
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    intervalRef.current = setInterval(() => {
      const remaining = Math.max(Math.ceil((expiryRef.current - Date.now()) / 1000), 0);
      setTimer(remaining);
      if (remaining === 0 && intervalRef.current) {
        clearInterval(intervalRef.current as any);
        intervalRef.current = null;
      }
    }, 500) as unknown as number;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current as any);
        intervalRef.current = null;
      }
      subscription.remove();
    };
  }, []);

  const emiList = TENURES.map(n => {
    const emi = calculateEMI(loanAmount, n, MONTHLY_RATE);
    const total = calculateTotal(emi, n);
    return { months: n, emi, total };
  });

  // Format timer to HH:MM:SS
  const hours = Math.floor(timer / 3600);
  const minutes = Math.floor((timer % 3600) / 60);
  const seconds = timer % 60;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={'#44226E'} />

      {/* Header */}
      <LinearGradient
        colors={['#44226E', '#8B6CB1']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerText}>Approved Loan</Text>
        <Text style={styles.loanAmount}>₹{LOAN_MAX.toLocaleString()}</Text>
      </LinearGradient>

      {/* Loan Amount Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Loan amount</Text>
        <Text style={styles.sectionSubtitle}>
          Move the slider to select your loan amount
        </Text>

        <View style={styles.sliderBox}>
          <Text style={styles.selectedAmount}>₹{loanAmount.toLocaleString()}</Text>

          {/* Gradient Slider */}
          <View style={styles.sliderContainer}>
            {/* Background for empty part */}
            <LinearGradient
              colors={['#E0E0E0', '#E0E0E0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientTrack}
            />

            {/* Gradient for filled part */}
            <LinearGradient
              colors={['#44226E', '#8B6CB1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.gradientTrack,
                { width: `${((loanAmount - LOAN_MIN) / (LOAN_MAX - LOAN_MIN)) * 100}%` },
              ]}
            />

            <Slider
              style={styles.slider}
              minimumValue={LOAN_MIN}
              maximumValue={LOAN_MAX}
              step={1}
              value={loanAmount}
              minimumTrackTintColor="transparent"
              maximumTrackTintColor="transparent"
              thumbTintColor="#44226E"
              onValueChange={setLoanAmount}
            />
          </View>

          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>₹{LOAN_MIN.toLocaleString()}</Text>
            <Text style={styles.sliderLabel}>₹{LOAN_MAX.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          ● An annualised interest rate of 29.95% p.a. will be applicable.
        </Text>
      </View>

      {/* Tenure Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Tenure</Text>
        <Text style={styles.sectionSubtitle}>
          Choose your preferred term in months
        </Text>

        <View style={styles.tenureTable}>
          {/* Header Row */}
          <View style={[styles.tenureRow, styles.tenureHeaderRow]}>
            <View style={styles.tenureCell}>
              <Text style={styles.tenureCellHeader}>Months</Text>
            </View>
            {emiList.map(item => {
              const selected = selectedTenure === item.months;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedTenure(item.months)}
                  key={item.months}
                  style={[styles.tenureHeaderCellWrapper, selected && styles.tenureCellSelected]}
                >
                  <Text
                    style={[styles.tenureText, selected ? styles.tenureTextSelected : styles.tenureTextUnselected]}
                  >
                    {item.months}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* EMI Row */}
          <View style={styles.tenureRow}>
            <View style={styles.tenureCell}><Text style={styles.tenureCellHeader}>EMI</Text></View>
            {emiList.map(item => {
              const selected = selectedTenure === item.months;
              return (
                <TouchableOpacity
                  key={item.months}
                  style={[styles.tenureCell, selected && styles.tenureCellSelected]}
                  onPress={() => setSelectedTenure(item.months)}
                >
                  <Text style={[styles.tenureText, selected ? styles.tenureTextSelected : styles.tenureTextFaded]}>
                    ₹{item.emi.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Total Row */}
          <View style={styles.tenureRow}>
            <View style={styles.tenureCell}><Text style={styles.tenureCellHeader}>Total</Text></View>
            {emiList.map(item => {
              const selected = selectedTenure === item.months;
              return (
                <TouchableOpacity
                  key={item.months}
                  style={[styles.tenureCell, selected && styles.tenureCellSelected]}
                  onPress={() => setSelectedTenure(item.months)}
                >
                  <Text style={[styles.tenureText, selected ? styles.tenureTextSelected : styles.tenureTextFaded]}>
                    ₹{item.total.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>


          <View style={styles.tenureRow}>
            <View style={styles.tenureCell}>
              <Text style={styles.tenureCellHeader} />
            </View>
            {emiList.map(item => {
              const selected = selectedTenure === item.months;
              return (
                <TouchableOpacity
                  key={item.months}
                  style={[styles.tenureCell, selected && styles.tenureCellSelected]}
                  onPress={() => setSelectedTenure(item.months)}
                >
                  {selected ? (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkBadgeText}>✓</Text>
                    </View>
                  ) : (
                    <View style={styles.unCheckBadge}>
                      <Text style={styles.unCheckBadgeText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

        </View>
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>
          Offer expires in {hours}:{minutes < 10 ? `0${minutes}` : minutes}:{seconds < 10 ? `0${seconds}` : seconds}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 24, alignItems: 'center' },
  headerText: { color: '#fff', fontSize: 16, marginBottom: 8 },
  loanAmount: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: '#868686', marginBottom: 12 },
  sliderBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#EAEAFF' },
  selectedAmount: { fontSize: 18, fontWeight: 'bold', color: '#44226E', textAlign: 'center', marginBottom: 8 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sliderLabel: { fontSize: 12, color: '#868686' },
  infoText: { fontSize: 12, color: 'black', marginTop: 8, fontWeight: 'bold' },
  infoContainer: { paddingHorizontal: 16 },

  // Gradient Slider
  sliderContainer: { width: '100%', height: 42, justifyContent: 'center' },
  gradientTrack: { position: 'absolute', height: 6, borderRadius: 3, width: '100%', top: 18 },
  slider: { width: '100%', height: 40 },

  tenureTable: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#EAEAFF' },
  tenureRow: { flexDirection: 'row' },
  tenureCell: { flex: 1, padding: 12, alignItems: 'center' },
  tenureCellHeader: { fontSize: 12, color: '#868686' },
  tenureText: { fontSize: 14, fontWeight: 'bold', color: '#44226E' },
  tenureTextSelected: { color: '#44226E' },
  tenureTextUnselected: { color: '#A8A8A8' },
  tenureTextFaded: { color: '#BDBDBD' },
  tenureCellSelected: { backgroundColor: '#FFC637' },
  tenureHeaderRow: { backgroundColor: '#FAFAFF' },
  tenureHeaderCellWrapper: { flex: 1, alignItems: 'center', padding: 12 },
  checkBadge: { position: 'absolute', bottom: 8, alignSelf: 'center', backgroundColor: '#28A745', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  checkBadgeText: { color: '#fff', fontWeight: 'bold' },
  unCheckBadgeText: { color: '#fff', fontWeight: 'bold' },
  unCheckBadge: { position: 'absolute', bottom: 8, alignSelf: 'center', backgroundColor: '#6C757D', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', opacity: 0.3 },
  timerContainer: { alignItems: 'center', marginTop: 16 },
  timerText: { fontSize: 14, color: '#44226E', fontWeight: 'bold' },
});

export default App;
