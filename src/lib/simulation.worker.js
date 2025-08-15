// Simulation Web Worker for transistor calculations
// This file handles the heavy computational work off the main thread

self.onmessage = function(e) {
    const {
      maxCurrent, maxVoltage, powerDissipation, rthJC, riseTime, fallTime,
      switchingFrequency, maxTemperature, ambientTemperature, totalRth,
      transistorType, rdsOnOhms, vceSat, simulationMode, coolingBudget,
      simulationAlgorithm, precisionSteps, effectiveCoolingBudget
    } = e.data;
  
    const isMosfetType = (type) => {
      return type.includes('MOSFET') || type.includes('GaN');
    };
  
    const checkCurrent = (current) => {
      let pCond = isMosfetType(transistorType)
        ? Math.pow(current, 2) * rdsOnOhms * 0.5
        : current * (vceSat || 0) * 0.5;
      const pSw = 0.5 * maxVoltage * current * ((riseTime + fallTime) * 1e-9) * (switchingFrequency * 1000);
      const pTotal = pCond + pSw;
      const tempRise = pTotal * totalRth;
      const finalTemp = ambientTemperature + tempRise;
  
      let failureReason = null;
      let details = '';
  
      if (finalTemp > maxTemperature) { 
        failureReason = 'Thermal'; 
        details = `Exceeded max junction temp of ${maxTemperature}°C. Reached ${finalTemp.toFixed(2)}°C.`; 
      }
      else if (powerDissipation && pTotal > powerDissipation) { 
        failureReason = 'Power Dissipation'; 
        details = `Exceeded component's max power dissipation of ${powerDissipation}W. Reached ${pTotal.toFixed(2)}W.`; 
      }
      else if (pTotal > effectiveCoolingBudget && simulationMode !== 'temp') { 
        failureReason = 'Cooling Budget'; 
        details = `Exceeded cooling budget of ${effectiveCoolingBudget}W. Reached ${pTotal.toFixed(2)}W.`; 
      }
      else if (current > maxCurrent) { 
        failureReason = 'Current'; 
        details = `Exceeded max current rating of ${maxCurrent.toFixed(2)}A.`; 
      }
  
      let fail = !!failureReason;
  
      if (simulationMode === 'temp') {
        fail = finalTemp > maxTemperature;
      } else if (simulationMode === 'budget') {
        fail = pTotal > effectiveCoolingBudget;
      }
  
      return {
        current,
        temperature: finalTemp,
        powerLoss: pTotal,
        conductionLoss: pCond,
        switchingLoss: pSw,
        failed: fail,
        failureReason,
        details,
        progress: (current / maxCurrent) * 100,
        limitValue: simulationMode === 'temp' ? maxTemperature : 
                   simulationMode === 'budget' ? effectiveCoolingBudget : maxCurrent
      };
    };
    
    // Simulation algorithms
    if (simulationAlgorithm === 'binary') {
      // Binary search algorithm
      let low = 0;
      let high = maxCurrent;
      let maxSafeCurrent = 0;
      let lastGoodResult = null;
      let iterations = 0;
      
      while (high - low > 0.01 && iterations < precisionSteps) {
        const mid = (low + high) / 2;
        const result = checkCurrent(mid);
        
        // Send progress update
        self.postMessage({
          type: 'dataPoint',
          data: {
            current: mid,
            temperature: result.temperature,
            powerLoss: result.powerLoss,
            conductionLoss: result.conductionLoss,
            switchingLoss: result.switchingLoss,
            progress: (iterations / precisionSteps) * 100,
            limitValue: result.limitValue
          }
        });
        
        if (!result.failed) {
          low = mid;
          maxSafeCurrent = mid;
          lastGoodResult = result;
        } else {
          high = mid;
        }
        
        iterations++;
      }
      
      // Send final result
      self.postMessage({
        type: 'complete',
        result: {
          status: maxSafeCurrent > 0 ? 'success' : 'failure',
          maxSafeCurrent: maxSafeCurrent,
          failureReason: lastGoodResult ? null : checkCurrent(0.1).failureReason,
          details: lastGoodResult ? 
            `Maximum safe current found: ${maxSafeCurrent.toFixed(2)}A` :
            checkCurrent(0.1).details,
          finalTemperature: lastGoodResult ? lastGoodResult.temperature : ambientTemperature,
          powerDissipation: {
            total: lastGoodResult ? lastGoodResult.powerLoss : 0,
            conduction: lastGoodResult ? lastGoodResult.conductionLoss : 0,
            switching: lastGoodResult ? lastGoodResult.switchingLoss : 0
          }
        }
      });
      
    } else {
      // Iterative algorithm
      let current = 0;
      const step = maxCurrent / precisionSteps;
      let maxSafeCurrent = 0;
      let lastGoodResult = null;
      
      for (let i = 0; i < precisionSteps; i++) {
        current += step;
        const result = checkCurrent(current);
        
        // Send progress update
        self.postMessage({
          type: 'dataPoint',
          data: {
            current: current,
            temperature: result.temperature,
            powerLoss: result.powerLoss,
            conductionLoss: result.conductionLoss,
            switchingLoss: result.switchingLoss,
            progress: (i / precisionSteps) * 100,
            limitValue: result.limitValue
          }
        });
        
        if (!result.failed) {
          maxSafeCurrent = current;
          lastGoodResult = result;
        } else {
          break;
        }
      }
      
      // Send final result
      self.postMessage({
        type: 'complete',
        result: {
          status: maxSafeCurrent > 0 ? 'success' : 'failure',
          maxSafeCurrent: maxSafeCurrent,
          failureReason: lastGoodResult ? null : checkCurrent(step).failureReason,
          details: lastGoodResult ? 
            `Maximum safe current found: ${maxSafeCurrent.toFixed(2)}A` :
            checkCurrent(step).details,
          finalTemperature: lastGoodResult ? lastGoodResult.temperature : ambientTemperature,
          powerDissipation: {
            total: lastGoodResult ? lastGoodResult.powerLoss : 0,
            conduction: lastGoodResult ? lastGoodResult.conductionLoss : 0,
            switching: lastGoodResult ? lastGoodResult.switchingLoss : 0
          }
        }
      });
    }
};