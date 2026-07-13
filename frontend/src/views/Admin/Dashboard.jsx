import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Users, Settings, FileText, CheckCircle, XCircle, SquarePen, SavePlus, X } from 'lucide-react';

export default function AdminDashboard() {
  const { apiFetch, profile } = useAuth();

  // Data lists
  const [schools, setSchools] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sections, setSections] = useState([]);

  // Active states
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'register'
  const [editSchoolSettings, setEditSchoolSettings] = useState(false) // 'view' | 'edit'
  const [selectedTermId, setSelectedTermId] = useState('');

  // Form values
  const [schoolName, setSchoolName] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [termName, setTermName] = useState('');
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [sectionRoom, setSectionRoom] = useState('');
  const [sectionTermId, setSectionTermId] = useState('');
  const [email, setEmail] = useState('');
  const [fullname, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [studentClass, setStudentClass] = useState('');

  // Bulk import form values
  const [csvContent, setCsvContent] = useState('');
  const [importSectionId, setImportSectionId] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  // Status/Logs
  const [statusMessage, setStatusMessage] = useState({ text: '', isError: false });

  const loadData = async () => {
    try {
      const schoolsData = await apiFetch('/sis/schools');
      setSchools(schoolsData);

      const termsData = await apiFetch('/sis/terms');
      setTerms(termsData);
      if (termsData.length > 0 && !selectedTermId) {
        setSelectedTermId(termsData[0].id);
      }

      const sectionsData = await apiFetch('/sis/sections');
      setSections(sectionsData);
    } catch (err) {
      console.error(err);
      showStatus('Failed to load SIS data.', true);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showStatus = (text, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage({ text: '', isError: false }), 5000);
  };

  // Submissions
  const handleCreateSchool = async (e) => {
    e.preventDefault();
    if (!schoolName) return;
    try {
      const newSchool = await apiFetch('/sis/schools', {
        method: 'PUT',
        body: JSON.stringify({ name: schoolName, address: schoolAddress })
      });
      setSchools([...schools, newSchool]);
      setSchoolName('');
      setSchoolAddress('');
      showStatus('School created successfully.');
    } catch (err) {
      showStatus(err.message, true);
    }
  };

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    if (!email, !fullname, !password, !studentClass) return;
    try {
      const newSchool = await apiFetch('/sis/students', {
        method: 'POST',
        body: JSON.stringify({ email: email, fullname: fullname, password: password, section_id: studentClass })
      });
      setEmail('');
      setFullName('');
      setPassword('');
      showStatus('Student registered successfully.');
    } catch (err) {
      showStatus(err.message, true);
    }
  };

  const handleCreateTerm = async (e) => {
    e.preventDefault();
    if (!termName || !termStart || !termEnd) return;
    try {
      const newTerm = await apiFetch('/sis/terms', {
        method: 'POST',
        body: JSON.stringify({
          name: termName,
          start_date: termStart,
          end_date: termEnd
        })
      });
      setTerms([...terms, newTerm]);
      setTermName('');
      setTermStart('');
      setTermEnd('');
      showStatus('Term created successfully.');
    } catch (err) {
      showStatus(err.message, true);
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!sectionName || !sectionTermId) return;
    try {
      const newSec = await apiFetch('/sis/sections', {
        method: 'POST',
        body: JSON.stringify({
          term_id: sectionTermId,
          name: sectionName,
          room: sectionRoom
        })
      });
      setSections([...sections, newSec]);
      setSectionName('');
      setSectionRoom('');
      setSectionTermId('');
      showStatus('Section created successfully.');
    } catch (err) {
      showStatus(err.message, true);
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!csvContent) return showStatus('Please enter CSV content.', true);
    setImporting(true);
    setImportResult(null);
    try {
      const result = await apiFetch('/sis/students/bulk', {
        method: 'POST',
        body: JSON.stringify({
          csv: csvContent,
          section_id: importSectionId || undefined
        })
      });
      setImportResult(result);
      setCsvContent('');
      showStatus('Bulk import process completed.');
      loadData();
    } catch (err) {
      showStatus(err.message, true);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Admin Portal</h1>
          <h1 className="text-lg font-medium text-gray-300 tracking-tight">{profile?.school_name}</h1>
          <p className="text-gray-400">Configure academic structures and provision accounts</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer flex items-center gap-2 ${activeTab === 'config' ? 'bg-green-800 text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
          >
            <Settings className="w-4 h-4" />
            SIS Configuration
          </button>
          <button
            id="tab-import"
            onClick={() => setActiveTab('register')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer flex items-center gap-2 ${activeTab === 'register' ? 'bg-green-800 text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
          >
            <Users className="w-4 h-4" />
            Register Students
          </button>
        </div>
      </div>

      {statusMessage.text && (
        <div
          className={`mb-6 p-4 rounded-lg border text-sm text-center ${statusMessage.isError
              ? 'bg-red-950/40 border-red-500/50 text-red-200'
              : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
            }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* SIS Configuration Tab */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Schools management */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white">1. School settings</h2>
              <form onSubmit={handleCreateSchool} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    School Name
                  </label>
                  { schools && !editSchoolSettings &&
                    <p className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                      {schools[0]?.name}
                    </p>
                  }
                  { editSchoolSettings &&
                    <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => {setSchoolName(e.target.value)}}
                    placeholder="E.g. Beacon Hill Academy"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Address
                  </label>
                  { schools && !editSchoolSettings &&
                    <p className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                      {schools[0]?.address}
                    </p>
                  }
                  { editSchoolSettings &&
                    <input
                    type="text"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    placeholder="E.g. 123 Education Way"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />}
                </div>

                <div className='flex gap-20'>
                  <button
                    type="button"
                    className={`w-full py-2 ${editSchoolSettings ? 'bg-red-500 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-lg text-sm font-medium shadow-md transition-colors flex items-center justify-center gap-1 cursor-pointer`}
                    onClick={ () => setEditSchoolSettings(prev => !prev) }
                  >
                    {
                      editSchoolSettings ?
                      <>
                        <X className='w-4 h-4' /> Cancel
                      </> :
                      <>
                        <SquarePen className="w-4 h-4" /> Edit
                      </>
                    }
                  </button>

                  <button
                    type="submit"
                    className={`w-full py-2 rounded-lg text-sm font-medium shadow-md transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed ${editSchoolSettings ? 'bg-orange-500 hover:bg-orange-700 text-white' : 'bg-gray-800 text-gray-500'}`}
                    disabled={!editSchoolSettings}
                  >
                    <SavePlus className="w-4 h-4" /> Update School
                  </button>
                </div>
              </form>
            </div>

            {/* <div className="mt-8 pt-6 border-t border-gray-800/80">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Active Schools</h3>
              {schools.length === 0 ? (
                <p className="text-gray-500 text-sm">No schools configured.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {schools.map((s) => (
                    <div key={s.id} className="p-3 bg-gray-950/50 border border-gray-800 rounded-lg">
                      <div className="font-medium text-white text-sm">{s.name}</div>
                      <div className="text-gray-400 text-xs mt-0.5">{s.address || 'No address'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div> */}
          </div>

          {/* Terms management */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white">2. Terms & Semesters</h2>
              <form onSubmit={handleCreateTerm} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Term Name
                  </label>
                  <input
                    type="text"
                    required
                    value={termName}
                    onChange={(e) => setTermName(e.target.value)}
                    placeholder="E.g. Fall 2026"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                      Start date
                    </label>
                    <input
                      type="date"
                      required
                      value={termStart}
                      onChange={(e) => setTermStart(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                      End date
                    </label>
                    <input
                      type="date"
                      required
                      value={termEnd}
                      onChange={(e) => setTermEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create Term
                </button>
              </form>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-800/80">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Academic Terms</h3>
              {terms.length === 0 ? (
                <p className="text-gray-500 text-sm">No terms configured.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {terms.map((t) => (
                    <div key={t.id} className="p-3 bg-gray-950/50 border border-gray-800 rounded-lg">
                      <div className="font-medium text-white text-sm">{t.name}</div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        {t.start_date} to {t.end_date}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sections management */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white">3. Class Sections</h2>
              <form onSubmit={handleCreateSection} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Select Term
                  </label>
                  <select
                    required
                    value={sectionTermId}
                    onChange={(e) => setSectionTermId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Choose Term --</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Section Name
                  </label>
                  <input
                    type="text"
                    required
                    value={sectionName}
                    onChange={(e) => setSectionName(e.target.value)}
                    placeholder="E.g. Grade 10 - Section A"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Room / Location
                  </label>
                  <input
                    type="text"
                    value={sectionRoom}
                    onChange={(e) => setSectionRoom(e.target.value)}
                    placeholder="E.g. Room 302"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create Section
                </button>
              </form>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-800/80">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Configured Sections</h3>
              {sections.length === 0 ? (
                <p className="text-gray-500 text-sm">No sections configured.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {sections.map((sec) => (
                    <div key={sec.id} className="p-3 bg-gray-950/50 border border-gray-800 rounded-lg">
                      <div className="font-medium text-white text-sm">{sec.name}</div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        {sec.room || 'No Room'} | Term: {terms.find(t => t.id === sec.term_id)?.name || 'Unknown'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Registration Tab */}
      {activeTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Single Registration */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white">Register Student</h2>
              <form onSubmit={handleRegisterStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Email
                  </label>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => {setEmail(e.target.value)}}
                    placeholder="johndoe@ihs.edu"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Fullname
                  </label>
                  <input
                    type="text"
                    value={fullname}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="***************"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Select Class
                  </label>
                  <select
                    required
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring focus:ring-blue-500"
                  >
                    <option value="">-- Choose Class --</option>
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className={`w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-md transition-colors flex items-center justify-center gap-1 cursor-pointer`}
                >
                  <Plus className="w-4 h-4" /> Register
                </button>
              </form>
            </div>
          </div>

          {/* Bulk upload form */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
            <h2 className="text-xl font-semibold mb-4 text-white">Import Student Accounts</h2>
            <p className="text-gray-400 text-sm mb-6">
              Paste student records formatted in CSV. Specify email, full name, and password for each.
            </p>

            <form onSubmit={handleBulkImport} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Optional: Enroll directly into Section
                </label>
                <select
                  id="import-section-select"
                  value={importSectionId}
                  onChange={(e) => setImportSectionId(e.target.value)}
                  className="w-full max-w-md px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring focus:ring-blue-500"
                >
                  <option value="">-- Do Not Enroll --</option>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} ({terms.find(t => t.id === sec.term_id)?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  CSV Student Data (Format: <code className="text-green-400">email,fullName,password</code>)
                </label>
                <textarea
                  id="csv-textarea"
                  rows={8}
                  required
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="email,fullName,password&#10;student_alex@beacon.edu,Alex Rivers,AlexPass123!&#10;student_casey@beacon.edu,Casey Brooks,CaseyPass123!"
                  className="w-full p-4 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring focus:ring-blue-500"
                />
              </div>

              <button
                id="process-import-btn"
                type="submit"
                disabled={importing}
                className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg text-sm font-medium shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                {importing ? 'Processing Accounts...' : 'Process Bulk Import'}
              </button>
            </form>
          </div>

          {/* Results display */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white">Import Status</h2>
              {!importResult ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto stroke-1 mb-3" />
                  <p className="text-sm">Submit your CSV file to view processing logs</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary badges */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-center">
                      <div className="text-2xl font-bold text-emerald-400">{importResult.succeeded?.length || 0}</div>
                      <div className="text-xs text-gray-400 mt-1">Succeeded</div>
                    </div>
                    <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-center">
                      <div className="text-2xl font-bold text-red-400">{importResult.failed?.length || 0}</div>
                      <div className="text-xs text-gray-400 mt-1">Failed</div>
                    </div>
                  </div>

                  {/* Logs lists */}
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                    {importResult.succeeded?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Succeeded Profiles
                        </h3>
                        <div className="space-y-1 text-xs">
                          {importResult.succeeded.map((item, idx) => (
                            <div key={idx} className="p-2 bg-gray-950 border border-gray-800 rounded text-gray-300">
                              <span className="font-semibold text-white">{item.fullName}</span> ({item.email})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {importResult.failed?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Failed Profiles
                        </h3>
                        <div className="space-y-1 text-xs">
                          {importResult.failed.map((item, idx) => (
                            <div key={idx} className="p-2 bg-gray-950/50 border border-red-950 text-gray-300">
                              <span className="font-semibold text-white">{item.student?.fullName || item.student?.email || 'Unknown'}</span>
                              <div className="text-red-400 text-[10px] mt-0.5 font-mono">{item.error}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-gray-800/80 text-[11px] text-gray-500 text-center font-mono">
              Secure provisioning bypasses confirmation
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
