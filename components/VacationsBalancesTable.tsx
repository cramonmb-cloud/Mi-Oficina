import React, { useState, useMemo, useEffect } from 'react';
import { Search, Settings } from 'lucide-react';
import { Employee, VacationRequest, EmployeeContract } from '../types';
import { updateEmployee, subscribeToEmployeeContracts } from '../services/dbService';

interface VacationsBalancesTableProps {
  employees: Employee[];
  vacationRequests: VacationRequest[];
}

export const VacationsBalancesTable: React.FC<VacationsBalancesTableProps> = ({ employees, vacationRequests }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [contracts, setContracts] = useState<EmployeeContract[]>([]);
  const [daysPer6Months, setDaysPer6Months] = useState<number>(() => {
    const saved = localStorage.getItem('vacationDaysPer6Months');
    if (saved) return parseInt(saved, 10);
    const legacyYear = localStorage.getItem('vacationDaysPerYear');
    return legacyYear ? Math.max(1, Math.round(parseInt(legacyYear, 10) / 2)) : 6;
  });
  const [accumulationRule, setAccumulationRule] = useState<'accumulate' | 'reset-on-anniversary'>('reset-on-anniversary');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [tempDaysValue, setTempDaysValue] = useState<string>(String(daysPer6Months));
  const [tempRuleValue, setTempRuleValue] = useState<'accumulate' | 'reset-on-anniversary'>(accumulationRule);
  const [isAdjustMode, setIsAdjustMode] = useState(false);
  const [pendingAdjustments, setPendingAdjustments] = useState<Record<string, { earned?: number | null, used?: number | null }>>({});

  // Keep state updated if changed elsewhere
  useEffect(() => {
    const handleDaysChanged = () => {
      const saved = localStorage.getItem('vacationDaysPer6Months');
      if (saved) {
        const parsed = parseInt(saved, 10);
        setDaysPer6Months(parsed);
        setTempDaysValue(String(parsed));
      }
    };
    const handleRuleChanged = () => {
      const saved = localStorage.getItem('vacationAccumulationRule');
      if (saved) {
        const rule = saved as 'accumulate' | 'reset-on-anniversary';
        setAccumulationRule(rule);
        setTempRuleValue(rule);
      }
    };
    window.addEventListener('vacationDaysPer6MonthsChanged', handleDaysChanged);
    window.addEventListener('vacationAccumulationRuleChanged', handleRuleChanged);
    return () => {
      window.removeEventListener('vacationDaysPer6MonthsChanged', handleDaysChanged);
      window.removeEventListener('vacationAccumulationRuleChanged', handleRuleChanged);
    };
  }, []);

  // Subscribe to employee contracts
  useEffect(() => {
    const unsubscribe = subscribeToEmployeeContracts((data) => {
      setContracts(data);
    });
    return () => unsubscribe();
  }, []);

  // Exclusively applies to 'Oficina' staff
  const officeEmployees = useMemo(() => {
    return employees.filter(e => e.category === 'Oficina');
  }, [employees]);

  // Calculates Vacation Balance for an Employee based on Active Contract (or 6-month cycle)
  const getEmployeeBalance = (emp: Employee) => {
    try {
      // Find all contracts matching this employee, sorted by generation timestamp or startDate descending
      const empContracts = contracts
        .filter(c => c.employeeId === emp.id || (c.employeeName && emp.firstName && emp.lastName && c.employeeName.toLowerCase().includes(emp.firstName.toLowerCase()) && c.employeeName.toLowerCase().includes(emp.lastName.toLowerCase())))
        .sort((a, b) => {
          const timeB = new Date(b.generatedAt || b.startDate + 'T00:00:00').getTime();
          const timeA = new Date(a.generatedAt || a.startDate + 'T00:00:00').getTime();
          return timeB - timeA;
        });
      
      const latestContract = empContracts[0] || (emp.contractStartDate ? {
        startDate: emp.contractStartDate,
        endDate: emp.contractEndDate || '',
        durationMonths: 6,
        generatedAt: emp.lastContractGeneratedAt || emp.contractStartDate + 'T00:00:00',
        id: emp.lastContractId || ''
      } : null);

      // Match employee by ID or full name
      const isEmpMatch = (r: VacationRequest) => {
        if (r.employeeId && emp.id && r.employeeId === emp.id) return true;
        if (r.employeeName && emp.firstName && emp.lastName) {
          const reqName = r.employeeName.toLowerCase().replace(/\s+/g, ' ').trim();
          const empFullName = `${emp.firstName} ${emp.lastName}`.toLowerCase().replace(/\s+/g, ' ').trim();
          if (reqName === empFullName || (reqName.includes(emp.firstName.toLowerCase()) && reqName.includes(emp.lastName.toLowerCase()))) {
            return true;
          }
        }
        return false;
      };

      // Filter non-rejected requests of type 'disponibles' / 'Vacaciones' (not salary discount)
      const empRequests = vacationRequests.filter(
        r => isEmpMatch(r) && r.status?.toUpperCase() !== 'RECHAZADA' && r.type !== 'descuento'
      );

      let totalEarned = 0;
      let used = 0;
      let statusText = '';
      let activeContractInfo: { startDate: string; endDate: string; durationMonths: number } | null = null;

      if (latestContract && latestContract.startDate) {
        // Contract-based calculation: each new contract grants a fresh entitlement (6 days for 6m)
        const duration = latestContract.durationMonths || 6;
        totalEarned = Math.max(1, Math.round(daysPer6Months * (duration / 6)));
        
        const cStart = latestContract.startDate;
        const cEnd = latestContract.endDate || '';
        const contractGenTime = latestContract.generatedAt 
          ? new Date(latestContract.generatedAt).getTime() 
          : new Date(cStart + 'T00:00:00').getTime();

        // Every time a new contract is generated, days reset!
        // Only count requests created AFTER this new contract was generated (or starting on/after contract start date)
        used = empRequests.reduce((sum, r) => {
          if (r.createdAt && latestContract.generatedAt) {
            const reqTime = new Date(r.createdAt).getTime();
            // If request was created BEFORE this new contract was generated, it belongs to the previous/expired period
            if (reqTime < contractGenTime - 30000) {
              return sum;
            }
          } else if (r.startDate < cStart) {
            return sum;
          }
          return sum + r.totalDays;
        }, 0);

        activeContractInfo = {
          startDate: cStart,
          endDate: cEnd,
          durationMonths: duration
        };
        statusText = `Contrato: ${cStart} al ${cEnd || 'Vigente'}`;
      } else if (emp.hireDate) {
        // Fallback if no formal contract has been generated yet
        totalEarned = daysPer6Months;
        used = empRequests.reduce((sum, r) => sum + r.totalDays, 0);
        statusText = 'Sin Contrato';
      } else {
        totalEarned = daysPer6Months;
        used = empRequests.reduce((sum, r) => sum + r.totalDays, 0);
        statusText = 'Sin Contrato';
      }

      // Apply manual adjustments if any (pending in UI has highest precedence)
      const pending = pendingAdjustments[emp.id];
      let finalEarned = totalEarned;
      let finalUsed = used;

      if (pending) {
        if (pending.earned !== undefined) {
          finalEarned = pending.earned === null ? totalEarned : pending.earned;
        } else if (emp.vacationDaysEarnedAdjustment !== undefined && emp.vacationDaysEarnedAdjustment !== null) {
          finalEarned = emp.vacationDaysEarnedAdjustment;
        }

        if (pending.used !== undefined) {
          finalUsed = pending.used === null ? used : pending.used;
        } else if (emp.vacationDaysUsedAdjustment !== undefined && emp.vacationDaysUsedAdjustment !== null) {
          finalUsed = emp.vacationDaysUsedAdjustment;
        }
      } else {
        if (emp.vacationDaysEarnedAdjustment !== undefined && emp.vacationDaysEarnedAdjustment !== null) {
          finalEarned = emp.vacationDaysEarnedAdjustment;
        }
        if (emp.vacationDaysUsedAdjustment !== undefined && emp.vacationDaysUsedAdjustment !== null) {
          finalUsed = emp.vacationDaysUsedAdjustment;
        }
      }

      const balance = finalEarned - finalUsed;
      
      return {
        semestersOfService: 1,
        yearsOfService: 0.5,
        totalEarned: finalEarned,
        used: finalUsed,
        balance,
        baseEarned: totalEarned,
        baseUsed: used,
        text: statusText,
        activeContract: activeContractInfo
      };
    } catch (e) {
      return { semestersOfService: 0, yearsOfService: 0, totalEarned: 0, used: 0, balance: 0, text: 'Error', activeContract: null, baseEarned: 0, baseUsed: 0 };
    }
  };

  // Filtered list of active Oficina employees with vacation statistics
  const filteredBalances = useMemo(() => {
    const list = officeEmployees
      .filter(e => e.status !== 'BAJA')
      .map(emp => {
        const stats = getEmployeeBalance(emp);
        return {
          emp,
          ...stats
        };
      })
      .filter(item => {
        // Search Term Filter
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${item.emp.firstName} ${item.emp.lastName}`.toLowerCase();
        const plaza = (item.emp.plaza || '').toLowerCase();
        const position = (item.emp.position || '').toLowerCase();
        return fullName.includes(searchLower) || plaza.includes(searchLower) || position.includes(searchLower);
      });

    // Sort alphabetically by first name and last name
    return list.sort((a, b) => {
      const nameA = `${a.emp.firstName || ''} ${a.emp.lastName || ''}`.toLowerCase().trim();
      const nameB = `${b.emp.firstName || ''} ${b.emp.lastName || ''}`.toLowerCase().trim();
      return nameA.localeCompare(nameB);
    });
  }, [officeEmployees, vacationRequests, contracts, searchTerm, pendingAdjustments, daysPer6Months]);

  // Unique categories for filtering
  const categories = useMemo(() => {
    const list = new Set(employees.filter(e => e.status !== 'BAJA' && e.category).map(e => e.category));
    return Array.from(list);
  }, [employees]);

  // General Metrics Sum
  const totalMetrics = useMemo(() => {
    let earnedSum = 0;
    let usedSum = 0;
    let balanceSum = 0;

    filteredBalances.forEach(item => {
      earnedSum += item.totalEarned;
      usedSum += item.used;
      balanceSum += item.balance;
    });

    return {
      earnedSum,
      usedSum,
      balanceSum,
      count: filteredBalances.length
    };
  }, [filteredBalances]);

  const handleStartAdjustMode = () => {
    const password = prompt("Introduce la contraseña para ajustar los días de vacaciones:");
    if (password === "Lacrimosa_12") {
      setPendingAdjustments({});
      setIsAdjustMode(true);
    } else if (password !== null) {
      alert("Contraseña incorrecta");
    }
  };

  const handleCancelAdjustments = () => {
    setPendingAdjustments({});
    setIsAdjustMode(false);
  };

  const handleSaveAdjustments = async () => {
    try {
      const keys = Object.keys(pendingAdjustments);
      for (const empId of keys) {
        const adjustment = pendingAdjustments[empId];
        const updateData: Partial<Employee> = {};
        if (adjustment.earned !== undefined) {
          updateData.vacationDaysEarnedAdjustment = adjustment.earned;
        }
        if (adjustment.used !== undefined) {
          updateData.vacationDaysUsedAdjustment = adjustment.used;
        }

        // Only call updateEmployee if there is an actual adjustment to save
        if (Object.keys(updateData).length > 0) {
          await updateEmployee(empId, updateData);
        }
      }
      alert("Ajustes guardados exitosamente.");
      setIsAdjustMode(false);
      setPendingAdjustments({});
    } catch (e) {
      console.error("Error updating manual vacation adjustments:", e);
      alert("Hubo un error al guardar los ajustes.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Description with Configurar Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Saldos de Vacaciones</h3>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-900 text-white rounded-md uppercase tracking-wider">
              Personal de Oficina
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Control de días acumulados por contrato laboral activo, disfrutados y remanentes</p>
        </div>
        <div className="flex gap-2">
          {isAdjustMode ? (
            <>
              <button
                type="button"
                onClick={handleCancelAdjustments}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-colors border border-slate-200 shadow-2xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAdjustments}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Guardar Ajustes
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleStartAdjustMode}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-colors border border-slate-200 shadow-2xs cursor-pointer"
              >
                Ajustar
              </button>
              <button
                type="button"
                onClick={() => {
                  setTempDaysValue(String(daysPer6Months));
                  setTempRuleValue(accumulationRule);
                  setIsConfigModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-colors border border-slate-200 shadow-2xs cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                Configurar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Control Tools */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por colaborador, plaza o puesto..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Counter Badge */}
        <div className="w-full sm:w-auto text-xs text-slate-500 font-medium">
          Mostrando <span className="font-bold text-slate-800">{filteredBalances.length}</span> colaboradores de oficina
        </div>
      </div>

      {/* Main Balances Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Puesto / Cargo</th>
                <th className="py-3 px-4 text-center">Contrato Vigente</th>
                <th className="py-3 px-4 text-center">Días Otorgados</th>
                <th className="py-3 px-4 text-center">Días Tomados</th>
                <th className="py-3 px-4 text-center font-bold text-slate-800">Saldo Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBalances.length > 0 ? (
                filteredBalances.map(({ emp, totalEarned, used, balance, baseEarned, baseUsed, text, activeContract }) => {
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-slate-900">{emp.firstName} {emp.lastName}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{emp.plaza || 'Sin Plaza'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs text-slate-700 font-medium">{emp.position || 'Auxiliar Administrativo'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Ingreso: {emp.hireDate || 'N/R'}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div>
                          {activeContract ? (
                            <div>
                              <span className="inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded text-[10px] font-bold font-mono">
                                {activeContract.startDate} al {activeContract.endDate || 'Vig.'}
                              </span>
                              <p className="text-[9px] text-indigo-600/80 font-medium mt-0.5">
                                Vigencia: {activeContract.durationMonths || 6} meses
                              </p>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[10px] font-medium font-mono">
                                {emp.hireDate ? `Desde ${emp.hireDate}` : 'Sin Contrato'}
                              </span>
                              <p className="text-[9px] text-slate-400 mt-0.5">
                                {text}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800 tabular-nums">
                        {isAdjustMode ? (
                          <input
                            type="number"
                            min="0"
                            max="365"
                            placeholder={String(baseEarned)}
                            className="w-16 px-1.5 py-1 border border-slate-200 rounded text-center text-xs font-bold focus:ring-1 focus:ring-slate-900 outline-none"
                            value={
                              pendingAdjustments[emp.id]?.earned === null 
                                ? '' 
                                : pendingAdjustments[emp.id]?.earned !== undefined 
                                  ? String(pendingAdjustments[emp.id]?.earned) 
                                  : emp.vacationDaysEarnedAdjustment !== undefined && emp.vacationDaysEarnedAdjustment !== null 
                                    ? String(emp.vacationDaysEarnedAdjustment) 
                                    : ''
                            }
                            onChange={(e) => {
                              const val = e.target.value === '' || isNaN(parseInt(e.target.value, 10)) ? null : parseInt(e.target.value, 10);
                              setPendingAdjustments(prev => ({
                                ...prev,
                                [emp.id]: {
                                  ...prev[emp.id],
                                  earned: val
                                }
                              }));
                            }}
                          />
                        ) : (
                          `${totalEarned} d`
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-rose-600 tabular-nums">
                        {isAdjustMode ? (
                          <input
                            type="number"
                            min="0"
                            max="365"
                            placeholder={String(baseUsed)}
                            className="w-16 px-1.5 py-1 border border-slate-200 rounded text-center text-xs font-bold focus:ring-1 focus:ring-slate-900 outline-none"
                            value={
                              pendingAdjustments[emp.id]?.used === null 
                                ? '' 
                                : pendingAdjustments[emp.id]?.used !== undefined 
                                  ? String(pendingAdjustments[emp.id]?.used) 
                                  : emp.vacationDaysUsedAdjustment !== undefined && emp.vacationDaysUsedAdjustment !== null 
                                    ? String(emp.vacationDaysUsedAdjustment) 
                                    : ''
                            }
                            onChange={(e) => {
                              const val = e.target.value === '' || isNaN(parseInt(e.target.value, 10)) ? null : parseInt(e.target.value, 10);
                              setPendingAdjustments(prev => ({
                                ...prev,
                                [emp.id]: {
                                  ...prev[emp.id],
                                  used: val
                                }
                              }));
                            }}
                          />
                        ) : (
                          `${used} d`
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold tabular-nums">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${
                          (() => {
                            if (balance <= 0) return 'bg-rose-50 border-rose-200 text-rose-700 font-extrabold';
                            if (balance >= 1 && balance <= 2) return 'bg-amber-50 border-amber-200 text-amber-800 font-bold';
                            return 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold';
                          })()
                        }`}>
                          {balance} días
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                    No se encontraron colaboradores que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal de Configuración de Días de Vacaciones por Contrato Semestral */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-base font-extrabold text-gray-900 mb-1">Configurar Prestación de Vacaciones</h4>
            <p className="text-xs text-slate-500 mb-4">Ajustes para esquema de renovación de contrato cada 6 meses.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Días otorgados por cada 6 meses trabajados (Periodo semestral)
                </label>
                <p className="text-[10px] text-slate-400 mb-2">Días que gana el colaborador al cumplir 6 meses de contrato.</p>
                <input
                  type="number"
                  min="1"
                  max="40"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                  value={tempDaysValue}
                  onChange={(e) => setTempDaysValue(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Regla de renovación / acumulación
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                  value={tempRuleValue}
                  onChange={(e) => setTempRuleValue(e.target.value as 'accumulate' | 'reset-on-anniversary')}
                >
                  <option value="accumulate">Acumulativo (Histórico por cada 6 meses cumplidos)</option>
                  <option value="reset-on-anniversary">Reinicio Semestral (Renovación de Contrato cada 6m)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTempDaysValue(String(daysPer6Months));
                    setTempRuleValue(accumulationRule);
                    setIsConfigModalOpen(false);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseInt(tempDaysValue, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                      localStorage.setItem('vacationDaysPer6Months', String(parsed));
                      localStorage.setItem('vacationAccumulationRule', tempRuleValue);
                      setDaysPer6Months(parsed);
                      setAccumulationRule(tempRuleValue);
                      setIsConfigModalOpen(false);
                      // Trigger custom events to notify other components
                      window.dispatchEvent(new Event('vacationDaysPer6MonthsChanged'));
                      window.dispatchEvent(new Event('vacationAccumulationRuleChanged'));
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
