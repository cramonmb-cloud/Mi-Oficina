import React, { useState, useMemo, useEffect } from 'react';
import { Search, Settings } from 'lucide-react';
import { Employee, VacationRequest } from '../types';
import { updateEmployee } from '../services/dbService';

interface VacationsBalancesTableProps {
  employees: Employee[];
  vacationRequests: VacationRequest[];
}

export const VacationsBalancesTable: React.FC<VacationsBalancesTableProps> = ({ employees, vacationRequests }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('TODOS');
  const [daysPer6Months, setDaysPer6Months] = useState<number>(() => {
    const saved = localStorage.getItem('vacationDaysPer6Months');
    if (saved) return parseInt(saved, 10);
    const legacyYear = localStorage.getItem('vacationDaysPerYear');
    return legacyYear ? Math.max(1, Math.round(parseInt(legacyYear, 10) / 2)) : 6;
  });
  const [accumulationRule, setAccumulationRule] = useState<'accumulate' | 'reset-on-anniversary'>(() => {
    const saved = localStorage.getItem('vacationAccumulationRule');
    return (saved as 'accumulate' | 'reset-on-anniversary') || 'accumulate';
  });
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

  // Calculates Vacation Balance for an Employee based on 6-month contract renewals
  const getEmployeeBalance = (emp: Employee) => {
    if (!emp.hireDate) return { semestersOfService: 0, yearsOfService: 0, totalEarned: 0, used: 0, balance: 0, text: 'Sin Fecha Ingreso' };
    
    try {
      const hire = new Date(emp.hireDate + 'T00:00:00');
      if (isNaN(hire.getTime())) return { semestersOfService: 0, yearsOfService: 0, totalEarned: 0, used: 0, balance: 0, text: 'Fecha Inválida' };
      
      const today = new Date();
      // Calculate elapsed calendar months
      const diffMonths = (today.getFullYear() - hire.getFullYear()) * 12 + (today.getMonth() - hire.getMonth()) + (today.getDate() >= hire.getDate() ? 0 : -1);
      const semestersOfService = Math.max(0, Math.floor(diffMonths / 6));
      const yearsOfService = semestersOfService * 0.5;
      
      // Filter approved requests of type 'disponibles' (subtracted days)
      const empRequests = vacationRequests.filter(
        r => r.employeeId === emp.id && r.status === 'APROBADA' && r.type === 'disponibles'
      );

      let totalEarned = 0;
      let used = 0;

      if (accumulationRule === 'reset-on-anniversary') {
        // Reset on every 6-month contract renewal
        totalEarned = semestersOfService >= 1 ? daysPer6Months : 0;

        // Current 6-month period range
        const periodStart = new Date(hire);
        periodStart.setMonth(hire.getMonth() + (semestersOfService * 6));
        const periodEnd = new Date(hire);
        periodEnd.setMonth(hire.getMonth() + ((semestersOfService + 1) * 6));

        // Sum only requests starting within the current 6-month period
        used = empRequests.reduce((sum, r) => {
          const reqStart = new Date(r.startDate + 'T00:00:00');
          if (reqStart >= periodStart && reqStart < periodEnd) {
            return sum + r.totalDays;
          }
          return sum;
        }, 0);
      } else {
        // Accumulative by completed 6-month periods
        totalEarned = semestersOfService >= 1 ? semestersOfService * daysPer6Months : 0;
        used = empRequests.reduce((sum, r) => sum + r.totalDays, 0);
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
        semestersOfService,
        yearsOfService,
        totalEarned: finalEarned,
        used: finalUsed,
        balance,
        baseEarned: totalEarned,
        baseUsed: used,
        text: semestersOfService === 0 
          ? 'En 1er periodo (< 6 meses)' 
          : `${semestersOfService} ${semestersOfService === 1 ? 'periodo de 6m cumplido' : 'periodos de 6m cumplidos'}`
      };
    } catch (e) {
      return { semestersOfService: 0, yearsOfService: 0, totalEarned: 0, used: 0, balance: 0, text: 'Error' };
    }
  };

  // Filtered list of active employees with vacation statistics
  const filteredBalances = useMemo(() => {
    const list = employees
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
        const matchesSearch = fullName.includes(searchLower) || plaza.includes(searchLower) || position.includes(searchLower);

        // Category Filter
        const matchesCategory = categoryFilter === 'TODOS' || item.emp.category === categoryFilter;

        return matchesSearch && matchesCategory;
      });

    // Sort alphabetically by first name and last name
    return list.sort((a, b) => {
      const nameA = `${a.emp.firstName || ''} ${a.emp.lastName || ''}`.toLowerCase().trim();
      const nameB = `${b.emp.firstName || ''} ${b.emp.lastName || ''}`.toLowerCase().trim();
      return nameA.localeCompare(nameB);
    });
  }, [employees, vacationRequests, searchTerm, categoryFilter, pendingAdjustments, accumulationRule]);

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
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Saldos de Vacaciones</h3>
          <p className="text-xs text-slate-500 mt-0.5">Control de días acumulados, disfrutados y remanentes</p>
        </div>
        <div className="flex gap-2">
          {isAdjustMode ? (
            <>
              <button
                type="button"
                onClick={handleCancelAdjustments}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-colors border border-slate-200 shadow-2xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAdjustments}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
              >
                Guardar Ajustes
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleStartAdjustMode}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-colors border border-slate-200 shadow-2xs"
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
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-colors border border-slate-200 shadow-2xs"
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

        {/* Filter Dropdown */}
        <div className="w-full sm:w-auto">
          <select
            className="w-full sm:w-48 py-1.5 px-3 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 cursor-pointer focus:ring-2 focus:ring-slate-900 outline-none"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="TODOS">Todas las Categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Balances Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Categoría / Puesto</th>
                <th className="py-3 px-4 text-center">Ingreso / Periodos (6m)</th>
                <th className="py-3 px-4 text-center">Ganados</th>
                <th className="py-3 px-4 text-center">Usados</th>
                <th className="py-3 px-4 text-center font-bold text-slate-800">Saldo Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBalances.length > 0 ? (
                filteredBalances.map(({ emp, semestersOfService, totalEarned, used, balance, baseEarned, baseUsed, text }) => {
                  const hasOneSemester = semestersOfService >= 1;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-slate-900">{emp.firstName} {emp.lastName}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{emp.plaza || 'Sin Plaza'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span className="px-2 py-0.5 text-[9px] bg-slate-100 text-slate-700 border border-slate-200 rounded font-semibold uppercase">
                            {emp.category || 'Sin Categoría'}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-1">{emp.position || 'N/R'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div>
                          <p className="text-slate-800 font-mono text-[11px]">{emp.hireDate || 'No Registrada'}</p>
                          <p className={`text-[10px] font-semibold mt-0.5 ${hasOneSemester ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {text}
                          </p>
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
                        <span className={`inline-block px-2.5 py-0.5 rounded-md border text-[11px] ${
                          (() => {
                            if (balance <= 0) return 'bg-slate-50 border-slate-200 text-slate-500';
                            if (balance >= 1 && balance <= 2) return 'bg-amber-50 border-amber-200 text-amber-800';
                            if (balance >= 3 && balance <= 5) return 'bg-amber-50 border-amber-200 text-amber-800';
                            return 'bg-emerald-50 border-emerald-200 text-emerald-800';
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
