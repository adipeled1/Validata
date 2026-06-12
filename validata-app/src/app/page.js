"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar/control';
import Participants from '../components/Participants/control';
import ParticipantsView from '../components/ParticipantsView/control';
import DataCollection from '../components/DataCollection/control';
import Analysis from '../components/Analysis/control';
import UserManagement from '../components/UserManagement/control';
import Toast from '../components/Toast/control';
import mockData from '../mockData.json';
import { supabase } from '../lib/supabase';
import { getCookie, setCookie, deleteCookie } from '../lib/cookies';
import { Clock, Ban, LogOut } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  
  // Dashboard views
  const [currentView, setCurrentView] = useState('participants');
  
  // App data
  const [participants, setParticipants] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [nextId, setNextId] = useState(1009);

  // User auth profile details
  const [userRole, setUserRole] = useState('team_member');
  const [userStatus, setUserStatus] = useState('pending');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const handleLogout = async () => {
    // Clear cookies
    deleteCookie('sb-access-token');
    deleteCookie('demo-session');
    deleteCookie('user-role');
    deleteCookie('user-status');
    
    try {
      if (!isDemoMode) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Supabase logout warning:', e);
    }
    
    router.push('/login');
    router.refresh();
  };

  // Check Auth & Fetch Data on Mount
  useEffect(() => {
    const initializeAuthAndData = async () => {
      setIsLoading(true);
      
      const token = getCookie('sb-access-token');
      const demoSessionStr = getCookie('demo-session');

      // 1. Check if authenticated
      if (!token && !demoSessionStr) {
        router.push('/login');
        return;
      }

      let email = '';
      let role = 'team_member';
      let status = 'pending';
      let isDemo = false;

      // 2. Parse Demo Session
      if (demoSessionStr) {
        try {
          const ds = JSON.parse(demoSessionStr);
          email = ds.email;
          role = ds.role;
          status = ds.status;
          isDemo = true;
        } catch (e) {
          router.push('/login');
          return;
        }
      } else {
        // 3. Verify Supabase Session
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser(token);
          if (userError || !user) throw new Error('Auth session invalid');

          email = user.email;

          // Fetch profile details
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError || !profile) {
            console.warn('Profile fetch warning/error, falling back to cookies:', profileError?.message);
            role = getCookie('user-role') || 'team_member';
            status = getCookie('user-status') || 'pending';
          } else {
            role = profile.role;
            status = profile.status;
            // Update cookies to keep in sync with database updates
            setCookie('user-role', role, 7);
            setCookie('user-status', status, 7);
          }
        } catch (e) {
          console.error('Session verification failed, logging out:', e);
          handleLogout();
          return;
        }
      }

      setCurrentUserEmail(email);
      setUserRole(role);
      setUserStatus(status);
      setIsDemoMode(isDemo);

      // If account status is not active, stop here and do not load dashboard data
      if (status !== 'active') {
        setIsLoading(false);
        return;
      }

      // 4. Fetch Clinical Trial Data (Only if Active)
      try {
        if (isDemo) {
          setParticipants(mockData.participants);
          setMeasurements(mockData.measurements);
        } else {
          // Fetch from API
          const resP = await fetch('/api/participants');
          if (!resP.ok) throw new Error('Failed to fetch participants');
          const pData = await resP.json();
          if (pData.error) throw new Error(pData.error);

          const resM = await fetch('/api/measurements');
          if (!resM.ok) throw new Error('Failed to fetch measurements');
          const mData = await resM.json();
          if (mData.error) throw new Error(mData.error);

          // Map database records to frontend expected camelCase formats
          const mappedParticipants = pData.map(p => ({
            id: p.id,
            consent: p.consent,
            status: p.status,
            age: p.age,
            gender: p.gender,
            healthStatus: p.health_status
          }));

          const mappedMeasurements = mData.map(m => {
            let formattedDate = m.timestamp;
            try {
              const d = new Date(m.timestamp);
              const day = d.getDate().toString().padStart(2, '0');
              const month = (d.getMonth() + 1).toString().padStart(2, '0');
              const year = d.getFullYear();
              const hours = d.getHours().toString().padStart(2, '0');
              const minutes = d.getMinutes().toString().padStart(2, '0');
              formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;
            } catch { }

            return {
              participant: m.participant_id,
              goniometer: `${parseFloat(m.goniometer).toFixed(1)}°`,
              aiModel: `${parseFloat(m.ai_model).toFixed(1)}°`,
              notes: m.notes,
              timestamp: formattedDate
            };
          });

          setParticipants(mappedParticipants);
          setMeasurements(mappedMeasurements);
        }
      } catch (error) {
        console.warn('API connection error, falling back to Demo Mode:', error);
        setIsDemoMode(true);
        setParticipants(mockData.participants);
        setMeasurements(mockData.measurements);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuthAndData();
  }, []);

  // Participant Handlers
  const handleAddParticipant = async (consent) => {
    if (isDemoMode) {
      const newId = `P-${nextId}`;
      setNextId((prev) => prev + 1);

      // Generate random demographics for demo
      const randomAge = Math.floor(Math.random() * 50) + 18;
      const randomGender = Math.random() > 0.5 ? 'Male' : 'Female';
      const randomHealth = Math.random() > 0.7 ? 'Sick' : 'Healthy';

      const newParticipant = {
        id: newId,
        consent,
        status: 'Active',
        age: randomAge,
        gender: randomGender,
        healthStatus: randomHealth
      };
      setParticipants([newParticipant, ...participants]);
      triggerToast(`Participant ${newId} registered successfully! (Demo)`);
    } else {
      try {
        const nextNumericId = participants.length > 0
          ? Math.max(...participants.map(p => parseInt(p.id.split('-')[1]) || 1000)) + 1
          : 1001;
        const newId = `P-${nextNumericId}`;

        const randomAge = Math.floor(Math.random() * 50) + 18;
        const randomGender = Math.random() > 0.5 ? 'Male' : 'Female';
        const randomHealth = Math.random() > 0.7 ? 'Sick' : 'Healthy';

        const res = await fetch('/api/participants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newId,
            consent,
            age: randomAge,
            gender: randomGender,
            healthStatus: randomHealth
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to add participant');
        }

        const newParticipant = {
          id: newId,
          consent,
          status: 'Active',
          age: randomAge,
          gender: randomGender,
          healthStatus: randomHealth
        };

        setParticipants([newParticipant, ...participants]);
        triggerToast(`Participant ${newId} registered and saved in database!`);
      } catch (error) {
        console.error('Error adding participant:', error);
        triggerToast('Failed to save participant: ' + error.message);
      }
    }
  };

  const handleSuspendParticipant = async (id) => {
    if (window.confirm(`Are you sure you want to suspend participant ${id}?`)) {
      if (isDemoMode) {
        setParticipants(
          participants.map((p) => (p.id === id ? { ...p, status: 'Dropped' } : p))
        );
        triggerToast('Participant status updated. (Demo)');
      } else {
        try {
          const res = await fetch('/api/participants', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: 'Dropped' })
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to suspend participant');
          }

          setParticipants(
            participants.map((p) => (p.id === id ? { ...p, status: 'Dropped' } : p))
          );
          triggerToast(`Participant ${id} suspended successfully.`);
        } catch (error) {
          console.error('Error updating participant status:', error);
          triggerToast('Failed to update participant: ' + error.message);
        }
      }
    }
  };

  // Measurement Handlers
  const handleLogMeasurement = async ({ participantId, goniometer, aiModel, notes }) => {
    const nowObj = new Date();
    const formattedTimestamp = `${nowObj.getDate().toString().padStart(2, '0')}/${(
      nowObj.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}/${nowObj.getFullYear()} ${nowObj
        .getHours()
        .toString()
        .padStart(2, '0')}:${nowObj.getMinutes().toString().padStart(2, '0')}`;

    const newMeasurement = {
      participant: participantId,
      goniometer: goniometer.includes('°') ? goniometer : `${goniometer}°`,
      aiModel: aiModel.includes('°') ? aiModel : `${aiModel}°`,
      notes,
      timestamp: formattedTimestamp,
    };

    if (isDemoMode) {
      setMeasurements([newMeasurement, ...measurements]);
      triggerToast('Measurement logged and saved! (Demo)');
    } else {
      try {
        const res = await fetch('/api/measurements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId, goniometer, aiModel, notes })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to log measurement');
        }

        setMeasurements([newMeasurement, ...measurements]);
        triggerToast('Measurement saved directly to the database!');
      } catch (error) {
        console.error('Error logging measurement:', error);
        triggerToast('Failed to save measurement: ' + error.message);
      }
    }
  };

  const handleFileUpload = async (file) => {
    if (isDemoMode) {
      triggerToast('Raw file upload simulated successfully. (Demo)');
    } else {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `raw_data/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('measurements-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        triggerToast(`File "${file.name}" uploaded successfully to Supabase Storage.`);
      } catch (error) {
        console.error('Storage upload error:', error);
        triggerToast('File upload failed: ' + error.message);
      }
    }
  };

  const handleGenerateReport = () => {
    triggerToast('Preparing PDF report... Download will begin shortly.');
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-medium">Validata is loading database...</p>
        </div>
      </div>
    );
  }

  // Pending Approval State Layout
  if (userStatus === 'pending') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 p-6 relative overflow-hidden font-sans">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[150px]" />
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl text-center relative z-10">
          <div className="inline-flex items-center justify-center p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-full mb-5 text-amber-400">
            <Clock className="h-8 w-8 animate-spin animate-infinite" style={{ animationDuration: '4s' }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Awaiting Mentor Approval</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Your registration was successful. However, access to Validata clinical trials portal requires approval. 
            Please ask a Project Mentor to activate your account <code className="text-indigo-300 font-mono text-xs">{currentUserEmail}</code> in the User Access panel.
          </p>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-sm font-semibold transition-all w-full border border-slate-700/60 active:scale-95 cursor-pointer animate-fade-in"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Suspended Account State Layout
  if (userStatus === 'suspended') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 p-6 relative overflow-hidden font-sans">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-rose-500/10 blur-[150px]" />
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl text-center relative z-10">
          <div className="inline-flex items-center justify-center p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-full mb-5 text-rose-400">
            <Ban className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Account Access Suspended</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Your access to Validata clinical trials has been suspended by a project supervisor. 
            Please contact the Project Mentor for support regarding <code className="text-rose-300 font-mono text-xs">{currentUserEmail}</code>.
          </p>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-sm font-semibold transition-all w-full border border-slate-700/60 active:scale-95 cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Active Dashboard Layout
  return (
    <div className="bg-slate-50 flex h-screen overflow-hidden text-slate-800">
      <Sidebar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        userRole={userRole}
        currentUserEmail={currentUserEmail}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative flex flex-col">
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-6 py-2.5 flex items-center justify-between text-sm shadow-sm font-medium z-10">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
              <span><strong>Running in Demo Mode:</strong> Using local mock data. Fill in credentials in <code>.env.local</code> to connect to Supabase.</span>
            </div>
          </div>
        )}

        <Toast
          message={toastMessage}
          show={showToast}
          onHide={() => setShowToast(false)}
        />

        <div className="p-8 max-w-6xl mx-auto w-full flex-grow">
          {currentView === 'participants' && (
            <Participants
              participants={participants}
              onAddParticipant={handleAddParticipant}
              onSuspendParticipant={handleSuspendParticipant}
            />
          )}

          {currentView === 'participantsView' && (
            <ParticipantsView
              participants={participants}
            />
          )}

          {currentView === 'data' && (
            <DataCollection
              participants={participants}
              onLogMeasurement={handleLogMeasurement}
              onFileUpload={handleFileUpload}
            />
          )}

          {currentView === 'analysis' && (
            <Analysis
              participants={participants}
              measurements={measurements}
              onGenerateReport={handleGenerateReport}
            />
          )}

          {currentView === 'userManagement' && userRole === 'mentor' && (
            <UserManagement
              isDemoMode={isDemoMode}
              currentUserEmail={currentUserEmail}
            />
          )}
        </div>
      </main>
    </div>
  );
}
