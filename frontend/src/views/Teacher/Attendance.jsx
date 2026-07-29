import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AttendanceRecorder } from '../../components/Teacher/AttendanceRecorder';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { AttendanceProvider, useAttendance } from '../../context/AttendanceContext';
import { InterventionProvider } from '../../context/InterventionContext';
import { StudentListPanel } from '../../components/Teacher/StudentListPanel';
import { AttendanceGrid } from '../../components/Teacher/AttendanceGrid';
import { InterventionTable } from '../../components/Teacher/InterventionTable';

function DashboardContent({ showRecorder, setShowRecorder }) {
  const { sectionId } = useParams();
  const { students, atRiskInfo, loading, refresh } = useAttendance();
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'grid'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-green-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-semibold">Loading Attendance Dashboard...</span>
      </div>
    );
  }

  const handleViewAttendance = (student) => {
    setActiveTab('grid');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <Link
        to="/teacher"
        className="inline-flex items-center text-sm font-semibold text-green-400 hover:text-green-300 gap-1 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Attendance Dashboard – Section {sectionId}
          </h1>
        </div>
        <button
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          onClick={refresh}
        >
          Refresh
        </button>
      </div>

      {/* Tab selector */}
      <div className="flex gap-6 border-b border-gray-800 mb-8">
        <button
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all ${activeTab === 'students' ? 'border-green-500 text-green-400 font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          onClick={() => setActiveTab('students')}
        >
          Class Roster
        </button>
        <button
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all ${activeTab === 'grid' ? 'border-green-500 text-green-400 font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          onClick={() => setActiveTab('grid')}
        >
          Attendance Grid
        </button>
      </div>

      {/* Content panels */}
      {activeTab === 'students' && (
        <StudentListPanel
          students={students}
          atRiskInfo={atRiskInfo}
          onViewAttendance={handleViewAttendance}
          onCreateIntervention={() => { }}
        />
      )}
      {activeTab === 'grid' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition"
              onClick={() => setShowRecorder(true)}
            >
              Record / Edit Attendance
            </button>
          </div>
          <AttendanceGrid />
          {showRecorder && (
            <AttendanceRecorder onClose={() => setShowRecorder(false)} />
          )}
        </>
      )}


      {/* Intervention tracking – always visible below */}
      <InterventionTable sectionId={sectionId} />
    </div>
  );
}

export default function TeacherAttendanceDashboard() {
  const { sectionId } = useParams();
  const [showRecorder, setShowRecorder] = useState(false);
  return (
    <AttendanceProvider>
      <InterventionProvider>
        <DashboardContent showRecorder={showRecorder} setShowRecorder={setShowRecorder} />
      </InterventionProvider>
    </AttendanceProvider>
  );
}
