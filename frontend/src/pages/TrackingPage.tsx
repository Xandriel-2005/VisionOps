import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Activity, Loader2, ArrowLeft, ExternalLink, Terminal, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api/client';
import { StatusChip } from '../components/StatusChip';
import { Modal } from '../components/Modal';

import type { RunStatus } from '../types';

interface MetricPoint {
  step: number;
  value: number;
  timestamp: number;
}

interface AirflowTask {
  task_id: string;
  state: string;
  start_date: string | null;
  end_date: string | null;
  duration: number | null;
}

interface TrackingData {
  run_id: number;
  model_name: string;
  status: RunStatus;
  metrics: Record<string, number>;
  metric_history: Record<string, MetricPoint[]>;
  airflow_tasks: AirflowTask[];
  airflow_url: string;
  mlflow_url: string;
}

export function TrackingPage() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('run_id');
  const navigate = useNavigate();

  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskLog, setSelectedTaskLog] = useState<{taskId: string, logs: string} | null>(null);
  const [isLogLoading, setIsLogLoading] = useState(false);

  const fetchTracking = useCallback(async () => {
    if (!runId) return;
    try {
      const res = await api.get<TrackingData>(`/api/tracking/${runId}/live`);
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch tracking data", err);
      setError("Failed to load live tracking data.");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 5000);
    return () => clearInterval(interval);
  }, [fetchTracking]);

  const fetchTaskLogs = useCallback(async (taskId: string, isInitial: boolean = false) => {
    if (isInitial) setIsLogLoading(true);
    try {
      const res = await api.get<{log: string}>(`/api/tracking/${runId}/tasks/${taskId}/logs`);
      setSelectedTaskLog(prev => prev?.taskId === taskId ? { taskId, logs: res.data.log } : prev);
    } catch (err: any) {
      if (isInitial) {
        setSelectedTaskLog(prev => prev?.taskId === taskId ? { 
          taskId, 
          logs: err.response?.data?.detail || 'Failed to fetch logs. Task may not have started yet.' 
        } : prev);
      }
    } finally {
      if (isInitial) setIsLogLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (selectedTaskLog?.taskId) {
      interval = setInterval(() => {
        fetchTaskLogs(selectedTaskLog.taskId, false);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedTaskLog?.taskId, fetchTaskLogs]);

  if (!runId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-md">
        <p className="text-muted">No run ID specified.</p>
        <button className="btn btn-primary" onClick={() => navigate('/history')}>Go to Run History</button>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-md" style={{ minHeight: '60vh' }}>
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-muted animate-pulse">Establishing connection...</p>
      </div>
    );
  }

  // Format data for Recharts
  const chartData: any[] = [];
  if (data?.metric_history && Object.keys(data.metric_history).length > 0) {
    // Collect all unique steps across all metrics
    const steps = new Set<number>();
    Object.values(data.metric_history).forEach(history => {
      history.forEach(pt => steps.add(pt.step));
    });

    // Create a data point for each step
    Array.from(steps).sort((a, b) => a - b).forEach(step => {
      const point: any = { step };
      Object.entries(data.metric_history).forEach(([key, history]) => {
        const pt = history.find(p => p.step === step);
        if (pt) {
          // Truncate long keys for better legend
          const shortKey = key.split('/').pop() || key;
          point[shortKey] = pt.value;
        }
      });
      chartData.push(point);
    });
  } else if (data?.metrics && Object.keys(data.metrics).length > 0) {
    // Fallback: If no epoch history, but we have final metrics (e.g. fast run)
    const finalPoint: any = { step: 'Final' };
    let hasFinalMetrics = false;
    Object.entries(data.metrics).forEach(([k, v]) => {
      if (k.startsWith('final/')) {
        finalPoint[k.split('/').pop() || k] = v;
        hasFinalMetrics = true;
      }
    });
    if (hasFinalMetrics) {
      chartData.push(finalPoint);
    }
  }

  const getTaskIcon = (state: string) => {
    switch (state) {
      case 'success': return <CheckCircle2 className="text-success" size={20} />;
      case 'running': return <Loader2 className="animate-spin text-primary" size={20} />;
      case 'failed': return <AlertCircle className="text-error" size={20} />;
      case 'queued': return <Clock className="text-warning" size={20} />;
      default: return <Circle className="text-muted" size={20} />;
    }
  };

  const handleNodeClick = (taskId: string) => {
    setSelectedTaskLog({ taskId, logs: '' });
    fetchTaskLogs(taskId, true);
  };

  const renderDAG = (tasks: AirflowTask[]) => {
    // Airflow exact layout mapping
    const NODE_WIDTH = 220;
    const NODE_HEIGHT = 64;
    const GAP_X = 64;
    const GAP_Y = 64;

    const KNOWN_NODES: Record<string, { col: number, row: number }> = {
      'check_bg_injection': { col: 0, row: 0 },
      'skip_injection': { col: 1, row: 0 },
      'inject_bg_images': { col: 1, row: 1 },
      'start_training_branch': { col: 2, row: 0 },
      'check_run_mode': { col: 3, row: 0 },
      'run_training_local': { col: 4, row: 0 },
      'sync_to_gpu': { col: 4, row: 1 },
      'run_training_remote': { col: 5, row: 1 },
      'sync_results_back': { col: 6, row: 1 },
      'cleanup_remote': { col: 7, row: 1 },
      'merge_training_branch': { col: 8, row: 0 },
      'cleanup_bg_images': { col: 9, row: 0 },
    };

    const EDGES = [
      ['check_bg_injection', 'skip_injection'],
      ['check_bg_injection', 'inject_bg_images'],
      ['skip_injection', 'start_training_branch'],
      ['inject_bg_images', 'start_training_branch'],
      ['start_training_branch', 'check_run_mode'],
      ['check_run_mode', 'run_training_local'],
      ['check_run_mode', 'sync_to_gpu'],
      ['sync_to_gpu', 'run_training_remote'],
      ['run_training_remote', 'sync_results_back'],
      ['sync_results_back', 'cleanup_remote'],
      ['run_training_local', 'merge_training_branch'],
      ['cleanup_remote', 'merge_training_branch'],
      ['merge_training_branch', 'cleanup_bg_images']
    ];

    // Build node positions, including dynamically found tasks
        const nodePositions: Record<string, { col: number, row: number, state: string }> = {};
    let maxCol = 9;
    
    // Default airflow tasks might have state, we use KNOWN_NODES for coordinates
    tasks.forEach(task => {
      if (KNOWN_NODES[task.task_id]) {
        nodePositions[task.task_id] = { ...KNOWN_NODES[task.task_id], state: task.state };
      } else {
        // Unknown dynamic tasks go to the right
        maxCol++;
        nodePositions[task.task_id] = { col: maxCol, row: 0, state: task.state };
        // Connect to previous max col if exists
        const prevNodes = Object.keys(nodePositions).filter(k => nodePositions[k].col === maxCol - 1);
        if (prevNodes.length > 0) {
          EDGES.push([prevNodes[0], task.task_id]);
        }
      }
    });

    // Ensure all known nodes are drawn even if not in tasks (Airflow graph shows all nodes, even skipped/unreached ones)
    Object.entries(KNOWN_NODES).forEach(([id, pos]) => {
      if (!nodePositions[id]) {
        nodePositions[id] = { ...pos, state: 'none' };
      }
    });

    const totalWidth = (Math.max(...Object.values(nodePositions).map(p => p.col)) + 1) * (NODE_WIDTH + GAP_X);
    const totalHeight = (Math.max(...Object.values(nodePositions).map(p => p.row)) + 1) * (NODE_HEIGHT + GAP_Y);

    return (
      <div className="relative overflow-x-auto overflow-y-hidden w-full bg-black" style={{ minHeight: `${totalHeight + 40}px` }}>
        {/* Decorative background grid */}
        <div className="absolute inset-0 bg-[radial-gradient(var(--primary-container)_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />
        
        <div className="relative p-xl" style={{ width: `${totalWidth}px`, height: `${totalHeight}px` }}>
          
          {/* SVG Edges Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ minWidth: '100%', minHeight: '100%' }}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#8C96A0" />
              </marker>
            </defs>
            {EDGES.map(([src, tgt]) => {
              const srcPos = nodePositions[src];
              const tgtPos = nodePositions[tgt];
              if (!srcPos || !tgtPos) return null;

              const sx = srcPos.col * (NODE_WIDTH + GAP_X) + NODE_WIDTH + 40; // +40 for padding
              const sy = srcPos.row * (NODE_HEIGHT + GAP_Y) + (NODE_HEIGHT / 2) + 40;
              const tx = tgtPos.col * (NODE_WIDTH + GAP_X) + 40;
              const ty = tgtPos.row * (NODE_HEIGHT + GAP_Y) + (NODE_HEIGHT / 2) + 40;

              const midX = sx + (GAP_X / 2);

              // Draw elbow path: start -> midX -> target Y -> target X
              const pathD = `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx - 2} ${ty}`;

              return (
                <path 
                  key={`${src}-${tgt}`} 
                  d={pathD} 
                  fill="none" 
                  stroke="#8C96A0" 
                  strokeWidth="2"
                  markerEnd="url(#arrow)"
                  className="opacity-70"
                />
              );
            })}
          </svg>

          {/* Nodes Layer */}
          {Object.entries(nodePositions).map(([id, pos]) => {
            const isRunning = pos.state === 'running';
            const isFailed = pos.state === 'failed';
            const isSuccess = pos.state === 'success';
            const isSkipped = pos.state === 'skipped';
            const isNone = pos.state === 'none';

            return (
              <button
                key={id}
                onClick={() => handleNodeClick(id)}
                style={{
                  position: 'absolute',
                  left: `${pos.col * (NODE_WIDTH + GAP_X) + 40}px`,
                  top: `${pos.row * (NODE_HEIGHT + GAP_Y) + 40}px`,
                  width: `${NODE_WIDTH}px`,
                  height: `${NODE_HEIGHT}px`
                }}
                className={`
                  z-10 flex items-center gap-sm px-md py-sm rounded-lg border-2 shadow-sm transition-all
                  ${isRunning ? 'border-primary bg-[#001122] shadow-[0_0_15px_rgba(0,240,255,0.4)] animate-pulse-border' : ''}
                  ${isSuccess ? 'border-success bg-[#002211] hover:bg-[#00331a]' : ''}
                  ${isFailed ? 'border-error bg-[#220000] hover:bg-[#330000]' : ''}
                  ${isSkipped ? 'border-[#ff69b4] bg-[#33001a] opacity-80 hover:opacity-100' : ''}
                  ${isNone ? 'border-outline bg-surface-dim opacity-50 hover:border-primary/50' : ''}
                  ${!isRunning && !isSuccess && !isFailed && !isSkipped && !isNone ? 'border-outline bg-surface-dim hover:border-primary/50' : ''}
                `}
              >
                {isRunning && <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping" />}
                {getTaskIcon(pos.state)}
                <div className="flex flex-col items-start text-left overflow-hidden">
                  <span className="text-sm font-medium text-foreground truncate w-full" title={id}>
                    {id}
                  </span>
                  <span className="text-[10px] text-muted capitalize">{pos.state === 'none' ? 'pending' : pos.state}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };



  return (
    <div className="pb-xl">
      <div className="page-header flex justify-between items-start glass-panel p-lg rounded-xl mb-xl">
        <div>
          <button
            className="btn btn-ghost mb-md p-0 flex items-center gap-xs hover:text-primary transition-colors"
            style={{ minWidth: 'auto', minHeight: 'auto', color: 'var(--text-muted)' }}
            onClick={() => navigate('/history')}
          >
            <ArrowLeft size={16} /> Back to History
          </button>
          <h1 className="text-gradient font-bold text-4xl mb-xs">Run #{runId} Tracking</h1>
          <p className="text-muted flex items-center gap-sm">
            Model: <span className="text-foreground font-mono">{data?.model_name || 'Loading...'}</span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-md">
          {data && <StatusChip status={data.status} />}
          <div className="flex gap-sm">
            {data?.airflow_url && (
              <a
                href={data.airflow_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline flex items-center gap-xs hover:border-primary hover:text-primary transition-all shadow-sm hover:shadow-primary/20"
              >
                <Terminal size={16} /> Airflow
                <ExternalLink size={14} className="ml-xs" />
              </a>
            )}
            {data?.mlflow_url && (
              <a
                href={data.mlflow_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary flex items-center gap-xs shadow-lg shadow-primary/30"
              >
                <Activity size={16} /> MLflow
                <ExternalLink size={14} className="ml-xs" />
              </a>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-lg p-md rounded-lg bg-error/10 border border-error/30 text-error flex items-center gap-sm shadow-inner">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          {/* Main Chart Area */}
          <div className="lg:col-span-2 flex flex-col gap-lg">
            <div className="card glass-panel relative overflow-hidden group hover:border-primary/50 transition-colors">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-50 group-hover:opacity-100 transition-opacity" />
              <h3 className="headline-sm mb-lg flex items-center gap-sm">
                <Activity className="text-primary" size={22} /> Training Metrics
              </h3>

              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-xl text-muted h-[350px] bg-surface-raised/30 rounded-lg border border-dashed border-border">
                  <Activity className="animate-pulse mb-sm opacity-50" size={48} />
                  <p>Awaiting metric telemetry...</p>
                </div>
              ) : (
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="step" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'var(--surface-raised)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />

                      {/* Dynamically render a line for each metric key (except step) */}
                      {Object.keys(chartData[0] || {}).filter(k => k !== 'step').map((key, i) => {
                        const colors = ['var(--primary)', 'var(--accent)', '#10b981', '#f59e0b', '#ef4444'];
                        return (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={colors[i % colors.length]}
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2 }}
                            activeDot={{ r: 8, strokeWidth: 0 }}
                            animationDuration={1500}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Current Stats summary */}
            <div className="flex flex-row flex-wrap gap-md">
              {Object.entries(data.metrics).slice(0, 4).map(([key, value]) => (
                <div key={key} className="flex-1 min-w-[120px] glass-panel p-md rounded-lg border border-border flex flex-col items-center justify-center text-center group hover:bg-surface-raised transition-colors hover:border-primary/30 hover:-translate-y-1 duration-300">
                  <p className="text-muted text-sm truncate w-full mb-xs" title={key}>{key.split('/').pop()}</p>
                  <p className="text-xl font-bold font-mono text-foreground">{Number(value).toFixed(4)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Full Width Sidebar Area -> Now Full Width for Landscape Graph */}
          <div className="lg:col-span-3 flex flex-col gap-lg mt-md">
            {/* Airflow Tasks Timeline */}
            <div className="card glass-panel hover:border-accent/50 transition-colors p-0 overflow-hidden bg-black border-outline-variant">
              <div className="p-lg border-b border-outline-variant bg-surface-container-highest">
                <h3 className="headline-sm flex items-center gap-sm">
                  <Terminal className="text-accent" size={22} /> Execution Trace
                </h3>
              </div>

              {data.airflow_tasks && data.airflow_tasks.length > 0 ? (
                renderDAG(data.airflow_tasks)
              ) : (
                <div className="flex flex-col items-center justify-center py-xl text-muted bg-surface-raised/20 rounded-lg">
                  <Clock className="animate-spin-slow mb-sm opacity-40" size={32} />
                  <p className="text-sm text-center">Tracing pipeline<br />execution states...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Log Modal */}
      <Modal 
        isOpen={selectedTaskLog !== null} 
        onClose={() => setSelectedTaskLog(null)}
        title={selectedTaskLog ? `Logs: ${selectedTaskLog.taskId}` : 'Logs'}
      >
        {isLogLoading ? (
          <div className="flex flex-col items-center justify-center py-xl">
            <Loader2 className="animate-spin text-primary mb-sm" size={32} />
            <p className="text-muted">Fetching logs from Airflow...</p>
          </div>
        ) : (
          <div className="bg-[#1e1e1e] rounded-lg overflow-auto max-h-[65vh] border border-outline-variant">
            <pre className="text-[#d4d4d4] font-mono text-xs whitespace-pre-wrap leading-relaxed p-md min-w-max">
              {selectedTaskLog?.logs || 'No logs available.'}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
}
