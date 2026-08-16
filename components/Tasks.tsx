import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Clock, CheckCircle, AlertTriangle, Pencil, Search, Filter, X, Calendar, Upload, FileText, Download, Paperclip } from 'lucide-react';
import { Task, TaskStatus, Employee } from '../types';
import { addTask, updateTaskStatus, deleteTask, updateTask } from '../services/dbService';

interface TasksProps {
  tasks: Task[];
  employees: Employee[];
  isLoading?: boolean;
}

const INITIAL_FORM_STATE = {
  title: '', 
  description: '', 
  status: TaskStatus.TODO, 
  priority: 'Media', 
  dueDate: new Date().toISOString().split('T')[0],
  assignedTo: ''
};

export const Tasks: React.FC<TasksProps> = ({ tasks, employees, isLoading }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deliveringTask, setDeliveringTask] = useState<Task | null>(null);
  const [deliveryFile, setDeliveryFile] = useState<string>('');
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Cast priority to string to avoid type issues with Partial<Task> initialization
  const [formData, setFormData] = useState<Partial<Task>>({
    ...INITIAL_FORM_STATE,
    priority: 'Media' as any,
    attachmentUrl: ''
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'attachmentUrl' | 'deliveryUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (field === 'attachmentUrl') {
        setFormData(prev => ({ ...prev, attachmentUrl: reader.result as string }));
      } else {
        setDeliveryFile(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const openDeliveryModal = (task: Task) => {
    setDeliveringTask(task);
    setDeliveryFile('');
    setIsDeliveryModalOpen(true);
  };

  const handleDeliverTask = async () => {
    if (deliveringTask && deliveryFile) {
      await updateTask(deliveringTask.id, {
        status: TaskStatus.DONE,
        deliveryUrl: deliveryFile,
        deliveredAt: new Date().toISOString()
      });
      setIsDeliveryModalOpen(false);
      setDeliveringTask(null);
      setDeliveryFile('');
    } else {
      alert("Por favor sube un archivo para entregar la tarea.");
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = (task.title.toLowerCase().includes(searchTerm.toLowerCase())) || 
                            (task.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesAssignee = filterAssignee ? task.assignedTo === filterAssignee : true;
      const matchesDate = filterDate ? task.dueDate === filterDate : true;
      
      return matchesSearch && matchesAssignee && matchesDate;
    });
  }, [tasks, searchTerm, filterAssignee, filterDate]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterAssignee('');
    setFilterDate('');
  };

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingId(task.id);
      setFormData(task);
    } else {
      setEditingId(null);
      setFormData({
        ...INITIAL_FORM_STATE,
        priority: 'Media' as any
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title) {
      if (editingId) {
        await updateTask(editingId, formData);
      } else {
        await addTask(formData as Omit<Task, 'id'>);
      }
      setIsModalOpen(false);
    }
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    await updateTaskStatus(task.id, newStatus);
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'Alta': return 'text-red-600 bg-red-50 border-red-200';
      case 'Media': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const Column = ({ title, status, icon: Icon, colorClass }: { title: string, status: TaskStatus, icon: any, colorClass: string }) => {
    const tasksInColumn = filteredTasks.filter(t => t.status === status);
    
    return (
      <div className="flex-1 min-w-[280px] sm:min-w-[320px] bg-slate-100/70 border border-slate-200/80 rounded-xl p-4 flex flex-col h-full">
        <div className={`flex items-center mb-3 pb-2.5 border-b ${colorClass}`}>
          <Icon className="w-4 h-4 mr-2 text-slate-700" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">{title}</h3>
          <span className="ml-auto bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs font-mono font-bold shadow-2xs">
            {tasksInColumn.length}
          </span>
        </div>
        
        <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900 mb-2"></div>
              <span className="text-xs text-slate-400">Cargando tareas...</span>
            </div>
          ) : tasksInColumn.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-lg bg-white/40">
              Sin tareas en esta etapa
            </div>
          ) : (
            tasksInColumn.map(task => (
              <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-md border uppercase font-bold tracking-wide ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenModal(task)} 
                      className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded p-1 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => { if(confirm('¿Eliminar esta tarea?')) { deleteTask(task.id); }}} 
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded p-1 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <h4 className="font-semibold text-xs text-slate-900 mb-1 leading-snug">{task.title}</h4>
                {task.description && (
                  <p className="text-[11px] text-slate-500 mb-3 line-clamp-2 leading-relaxed">{task.description}</p>
                )}
                
                {/* Files Section */}
                {(task.attachmentUrl || task.deliveryUrl) && (
                  <div className="flex gap-1.5 mb-3 flex-wrap">
                    {task.attachmentUrl && (
                      <a 
                        href={task.attachmentUrl} 
                        download={`adjunto-${task.id}`}
                        className="text-[10px] font-medium flex items-center bg-slate-100 px-2 py-0.5 rounded text-slate-700 hover:bg-slate-200 border border-slate-200"
                        title="Descargar Adjunto"
                      >
                        <Paperclip className="w-3 h-3 mr-1 text-slate-500" /> Adjunto
                      </a>
                    )}
                    {task.deliveryUrl && (
                      <a 
                        href={task.deliveryUrl} 
                        download={`entrega-${task.id}`}
                        className="text-[10px] font-medium flex items-center bg-emerald-50 px-2 py-0.5 rounded text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        title="Descargar Entrega"
                      >
                        <FileText className="w-3 h-3 mr-1 text-emerald-600" /> Entrega
                      </a>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-end pt-2 border-t border-slate-100 mt-2">
                  <div className="text-[11px] text-slate-500">
                    <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 mb-0.5">
                      <Clock className="w-3 h-3"/> {task.dueDate}
                    </div>
                    <div className="font-medium text-slate-700 truncate max-w-[130px]">
                      {employees.find(e => e.id === task.assignedTo)?.firstName || 'Sin asignar'}
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    {status !== TaskStatus.TODO && (
                      <button 
                        onClick={() => handleStatusChange(task, TaskStatus.TODO)} 
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition-colors" 
                        title="Mover a Por Hacer"
                      >
                        ←
                      </button>
                    )}
                    {status !== TaskStatus.IN_PROGRESS && (
                      <button 
                        onClick={() => handleStatusChange(task, TaskStatus.IN_PROGRESS)} 
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition-colors" 
                        title="Mover a En Progreso"
                      >
                        {status === TaskStatus.TODO ? '→' : '←'}
                      </button>
                    )}
                    {status !== TaskStatus.DONE && (
                      <button 
                        onClick={() => openDeliveryModal(task)} 
                        className="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center text-xs transition-colors" 
                        title="Entregar y Completar"
                      >
                        <Upload className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tablero de Tareas</h2>
          <p className="text-xs text-slate-500 mt-0.5">Gestión operativa y seguimiento de entregas</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg flex items-center transition-colors shadow-xs text-xs font-semibold whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nueva Tarea
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por título o descripción..." 
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <select 
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-slate-900 outline-none cursor-pointer"
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="">Todo el Personal</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input 
            type="date" 
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-slate-900 outline-none transition-all cursor-pointer"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>

        {(searchTerm || filterAssignee || filterDate) ? (
          <button 
            onClick={clearFilters}
            className="flex items-center justify-center px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Limpiar Filtros
          </button>
        ) : <div className="hidden md:block" />}
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-280px)]">
        <Column title="Por Hacer" status={TaskStatus.TODO} icon={AlertTriangle} colorClass="border-gray-300" />
        <Column title="En Progreso" status={TaskStatus.IN_PROGRESS} icon={Clock} colorClass="border-blue-400" />
        <Column title="Completado" status={TaskStatus.DONE} icon={CheckCircle} colorClass="border-green-400" />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800">{editingId ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">Título</label>
                <input required placeholder="Título" className="w-full border p-2 rounded bg-white text-gray-900 placeholder-gray-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              
              <div>
                <label className="text-xs text-gray-500">Descripción</label>
                <textarea placeholder="Descripción" className="w-full border p-2 rounded h-20 bg-white text-gray-900 placeholder-gray-500" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs text-gray-500">Asignar a (Solo Oficina)</label>
                   <select className="w-full border p-2 rounded bg-white text-gray-900" value={formData.assignedTo || ''} onChange={e => setFormData({...formData, assignedTo: e.target.value})}>
                     <option value="">-- Seleccionar --</option>
                     {employees
                        .filter(e => e.category === 'Oficina')
                        .sort((a, b) => {
                          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                          return nameA.localeCompare(nameB);
                        })
                        .map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="text-xs text-gray-500">Prioridad</label>
                   <select className="w-full border p-2 rounded bg-white text-gray-900" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}>
                     <option>Baja</option>
                     <option>Media</option>
                     <option>Alta</option>
                   </select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs text-gray-500">Fecha Límite</label>
                   <input type="date" className="w-full border p-2 rounded bg-white text-gray-900" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>
                <div>
                   <label className="text-xs text-gray-500">Estado</label>
                   <select className="w-full border p-2 rounded bg-white text-gray-900" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as TaskStatus})}>
                     <option value={TaskStatus.TODO}>{TaskStatus.TODO}</option>
                     <option value={TaskStatus.IN_PROGRESS}>{TaskStatus.IN_PROGRESS}</option>
                     <option value={TaskStatus.DONE}>{TaskStatus.DONE}</option>
                   </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Adjuntar Archivo (Opcional)</label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg flex items-center text-sm transition-colors">
                    <Paperclip className="w-4 h-4 mr-2" />
                    {formData.attachmentUrl ? 'Cambiar Archivo' : 'Seleccionar Archivo'}
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'attachmentUrl')} />
                  </label>
                  {formData.attachmentUrl && (
                    <span className="text-xs text-green-600 flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" /> Archivo adjunto
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
                  {editingId ? 'Actualizar' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isDeliveryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Entregar Tarea</h3>
            <p className="text-sm text-gray-600 mb-4">Para completar la tarea <strong>{deliveringTask?.title}</strong>, por favor sube el archivo de entrega.</p>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative">
                {deliveryFile ? (
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-600">Archivo seleccionado</p>
                    <button 
                      onClick={() => setDeliveryFile('')}
                      className="text-xs text-red-500 mt-2 hover:underline"
                    >
                      Cambiar archivo
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-600 font-medium">Click para subir archivo</span>
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'deliveryUrl')} />
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setIsDeliveryModalOpen(false)} 
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeliverTask} 
                  disabled={!deliveryFile}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Entregar y Completar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};