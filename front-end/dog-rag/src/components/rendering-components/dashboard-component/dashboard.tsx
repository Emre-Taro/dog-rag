'use client';

import { useState, useEffect, useRef } from 'react';
import { useDog } from '@/contexts/DogContext';
import { useAuth, getAuthHeaders } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { DashboardStats, ActivityRecord, HealthIndicator } from '@/types';
import Link from 'next/link';
import { ToiletFailRateChart } from '@/components/dashboard/ToiletFailRateChart';
import { BarkNightChart } from '@/components/dashboard/BarkNightChart';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { CustomLogList } from '@/components/dashboard/CustomLogList';
import { ConcernList } from '@/components/dashboard/ConcernList';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

export function DashboardPage() {
  const { selectedDogId, selectedDog, dogs, setSelectedDogId } = useDog();
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);
  const [healthIndicators, setHealthIndicators] = useState<HealthIndicator[]>([]);
  const [toiletFailRateData, setToiletFailRateData] = useState<any[]>([]);
  const [barkNightData, setBarkNightData] = useState<any[]>([]);
  const [activityHeatmapData, setActivityHeatmapData] = useState<any[]>([]);
  const [customLogs, setCustomLogs] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [ragMessages, setRagMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [exportingPDF, setExportingPDF] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDogId) {
      fetchDashboardData();
    }
  }, [selectedDogId, days]);

  const fetchDashboardData = async () => {
    if (!selectedDogId) return;

    setLoading(true);
    try {
      // Fetch stats
      const statsResponse = await fetch(
        `/api/dashboard/stats?dog_id=${selectedDogId}&days=${days}`,
        {
          headers: getAuthHeaders(token),
        }
      );
      const statsResult = await statsResponse.json();
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // Fetch summary
      const summaryResponse = await fetch(
        `/api/dashboard/summary?dog_id=${selectedDogId}&days=${days}`,
        {
          headers: getAuthHeaders(token),
        }
      );
      const summaryResult = await summaryResponse.json();
      if (summaryResult.success) {
        setActivityRecords(summaryResult.data.activity_records || []);
        setHealthIndicators(summaryResult.data.health_indicators || []);
      }

      // Fetch visualization data
      const vizResponse = await fetch(
        `/api/dashboard/visualization?dog_id=${selectedDogId}&days=${days}`,
        {
          headers: getAuthHeaders(token),
        }
      );
      const vizResult = await vizResponse.json();
      if (vizResult.success) {
        setToiletFailRateData(vizResult.data.toiletFailRate || []);
        setBarkNightData(vizResult.data.barkNight || []);
        setActivityHeatmapData(vizResult.data.activityHeatmap || []);
      }

      // Fetch custom logs
      const customLogsResponse = await fetch(
        `/api/dashboard/custom-logs?dog_id=${selectedDogId}&days=${days}`,
        {
          headers: getAuthHeaders(token),
        }
      );
      const customLogsResult = await customLogsResponse.json();
      if (customLogsResult.success) {
        setCustomLogs(customLogsResult.data.customLogs || []);
      }

      // Fetch daily stats
      const dailyStatsResponse = await fetch(
        `/api/dashboard/daily-stats?dog_id=${selectedDogId}&days=${days}`,
        {
          headers: getAuthHeaders(token),
        }
      );
      const dailyStatsResult = await dailyStatsResponse.json();
      if (dailyStatsResult.success) {
        setDailyStats(dailyStatsResult.data);
      }

      // Fetch RAG messages for concerns
      const ragMessagesResponse = await fetch(
        `/api/rag/messages?dogId=${selectedDogId}&limit=50`,
        {
          headers: getAuthHeaders(token),
        }
      );
      const ragMessagesResult = await ragMessagesResponse.json();
      if (ragMessagesResult.success) {
        setRagMessages(ragMessagesResult.messages || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedDogId || !dashboardRef.current || exportingPDF) return;

    setExportingPDF(true);
    try {
      // Wait a bit to ensure all charts are rendered
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Capture the dashboard as an image
      // Use simpler options to avoid lab() color function parsing issues
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0f172a',
        allowTaint: false,
        removeContainer: false,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // Ensure SVG elements are visible
          const svgs = clonedDoc.querySelectorAll('svg');
          svgs.forEach((svg) => {
            svg.setAttribute('style', 'opacity: 1 !important; visibility: visible !important;');
          });
        },
      }).catch((error) => {
        console.error('html2canvas error (first attempt):', error);
        // Retry with more permissive settings
        console.log('Retrying with simplified settings...');
        return html2canvas(dashboardRef.current!, {
          scale: 1.5,
          useCORS: false,
          logging: false,
          backgroundColor: '#0f172a',
          allowTaint: true,
          removeContainer: false,
        });
      }).catch((error) => {
        console.error('html2canvas error (second attempt):', error);
        throw new Error(`スクリーンショットの取得に失敗しました: ${error.message || '不明なエラー'}`);
      });

      if (!canvas) {
        throw new Error('Canvas creation failed');
      }

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Convert pixels to mm (96 DPI = 0.264583 mm per pixel)
      const pxToMm = 0.264583;
      const imgWidth = (canvas.width * pxToMm);
      const imgHeight = (canvas.height * pxToMm);
      
      // Calculate scale to fit width
      const widthScale = pdfWidth / imgWidth;
      const scaledWidth = pdfWidth;
      const scaledHeight = imgHeight * widthScale;

      // Get image data
      const imgData = canvas.toDataURL('image/png', 0.95);
      
      if (!imgData || imgData === 'data:,') {
        throw new Error('画像データの生成に失敗しました');
      }

      // Add pages for long content
      let heightLeft = scaledHeight;
      let position = 0;
      let pageNum = 1;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, scaledWidth, scaledHeight);
      heightLeft -= pdfHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - scaledHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, scaledWidth, scaledHeight);
        heightLeft -= pdfHeight;
        pageNum++;
        
        // Safety check
        if (pageNum > 20) {
          console.warn('Reached maximum page limit');
          break;
        }
      }

      // Save PDF
      const fileName = `dashboard-${selectedDog?.dogName || 'report'}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      alert(`PDFエクスポートに失敗しました: ${errorMessage}`);
    } finally {
      setExportingPDF(false);
    }
  };

  if (!selectedDogId || !selectedDog) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="mb-4">Please select a pet</p>
          {dogs.length === 0 && (
            <Link href="/dog-profile">
              <Button>Add a pet</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const maxActivity = Math.max(...activityRecords.map((r) => r.count), 0);

  return (
    <div ref={dashboardRef} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analysis & Reports</h1>
          <p className="text-sm text-slate-400">Visualize health trends and patterns</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <select
            value={selectedDogId || ''}
            onChange={(e) => setSelectedDogId(e.target.value ? parseInt(e.target.value) : null)}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-200"
          >
            {dogs.map((dog) => (
              <option key={dog.id} value={dog.id}>
                {dog.dogName}
              </option>
            ))}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="rounded-lg bg-slate-900 px-3 py-2 text-slate-200"
          >
            <option value="7">Past 7 days</option>
            <option value="30">Past 30 days</option>
            <option value="90">Past 90 days</option>
            <option value="365">Past year</option>
          </select>
          <Button variant="ghost" onClick={handleExportPDF} disabled={exportingPDF}>
            {exportingPDF ? '出力中...' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Daily Statistics Cards */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : dailyStats ? (
        <section className="grid gap-4 md:grid-cols-4">
          {/* 食事統計 */}
          <div className="rounded-2xl bg-slate-900 p-4 text-xs text-slate-300">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800">
                🍽️
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mb-2">食事（1日平均）</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">回数:</span>
                <span className="text-sm font-semibold text-slate-50">{dailyStats.meals.avgMealsPerDay}回</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">1回あたり:</span>
                <span className="text-sm font-semibold text-slate-50">{dailyStats.meals.avgGramsPerMeal}g</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">1日合計:</span>
                <span className="text-sm font-semibold text-slate-50">{dailyStats.meals.avgGramsPerDay}g</span>
              </div>
            </div>
          </div>

          {/* 排泄統計 */}
          <div className="rounded-2xl bg-slate-900 p-4 text-xs text-slate-300">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800">
                🚽
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mb-2">排泄（1日平均）</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">おしっこ:</span>
                <span className="text-sm font-semibold text-slate-50">{dailyStats.toilet.avgOnePerDay}回</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">うんち:</span>
                <span className="text-sm font-semibold text-slate-50">{dailyStats.toilet.avgTwoPerDay}回</span>
              </div>
            </div>
          </div>

          {/* 睡眠統計 */}
          <div className="rounded-2xl bg-slate-900 p-4 text-xs text-slate-300">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800">
                😴
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mb-2">睡眠（1日平均）</div>
            <div className="mt-1 text-xl font-semibold text-slate-50">{dailyStats.sleep.avgHoursPerDay}時間</div>
            <div className="mt-1 text-[10px] text-slate-500">
              {Math.round(dailyStats.sleep.avgHoursPerDay * 60)}分
            </div>
          </div>

          {/* 異常検知 */}
          <div className="rounded-2xl bg-slate-900 p-4 text-xs text-slate-300">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800">
                ⚠️
              </div>
              {dailyStats.anomalies.count > 0 && (
                <span className="text-xs font-semibold text-red-400">要確認</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mb-2">異常検知</div>
            <div className="mt-1 text-xl font-semibold text-slate-50">{dailyStats.anomalies.count}件</div>
            {dailyStats.anomalies.count > 0 && (
              <div className="mt-2 space-y-0.5 text-[10px] text-slate-500">
                {dailyStats.anomalies.details.highDifficultyBarks > 0 && (
                  <div>・激しい鳴き声: {dailyStats.anomalies.details.highDifficultyBarks}回</div>
                )}
                {dailyStats.anomalies.details.failedToilets > 0 && (
                  <div>・トイレ失敗: {dailyStats.anomalies.details.failedToilets}回</div>
                )}
                {dailyStats.anomalies.details.littleFood > 0 && (
                  <div>・食事少量: {dailyStats.anomalies.details.littleFood}回</div>
                )}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* グラフ領域 */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Toilet Fail Rate Chart */}
        <div className="rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-1 text-sm font-semibold">排泄失敗率</h2>
          <p className="mb-4 text-xs text-slate-400">過去{days}日間のトイレ失敗率の推移</p>
          {toiletFailRateData.length > 0 ? (
            <ToiletFailRateChart data={toiletFailRateData} />
          ) : (
            <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
              データがありません
            </div>
          )}
        </div>

        {/* Bark at Night Chart */}
        <div className="rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-1 text-sm font-semibold">夜間の鳴き声</h2>
          <p className="mb-4 text-xs text-slate-400">過去{days}日間の夜間の鳴き声回数</p>
          {barkNightData.length > 0 ? (
            <BarkNightChart data={barkNightData} />
          ) : (
            <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
              データがありません
            </div>
          )}
        </div>
      </section>

      {/* Activity Heatmap and Concerns */}
      <section className="grid gap-4 lg:grid-cols-5">
        {/* Activity Heatmap */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-1 text-sm font-semibold">活動ヒートマップ</h2>
          <p className="mb-4 text-xs text-slate-400">過去{days}日間のログ入力回数（色の濃さで表示）</p>
          {activityHeatmapData.length > 0 ? (
            <ActivityHeatmap data={activityHeatmapData} days={days} />
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              データがありません
            </div>
          )}
        </div>

        {/* Concerns from RAG Messages */}
        <div className="lg:col-span-3 rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-1 text-sm font-semibold">困りごと・質問</h2>
          <p className="mb-4 text-xs text-slate-400">RAGチャットでの質問から</p>
          <ConcernList messages={ragMessages} dogId={selectedDogId} />
        </div>
      </section>

      {/* Custom Logs (Important Notes) */}
      <section className="rounded-2xl bg-slate-900 p-5">
        <h2 className="mb-1 text-sm font-semibold">重要事項</h2>
        <p className="mb-4 text-xs text-slate-400">過去{days}日間のカスタムログ（重要な記録）</p>
        <CustomLogList logs={customLogs} />
      </section>
    </div>
  );
}
