import { useState, useMemo } from 'react';
import { Trophy, Medal, Award, MapPin, School, Map } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAllProfiles } from '@/data/userProfiles';
import { getAllAccounts } from '@/data/accounts';
import { realSchoolsMojokerto } from '@/data/realSchoolsMojokerto';

type Tab = 'school' | 'regency' | 'province';

export function LeaderboardView() {
  const { currentProfile, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('school');

  const leaderboardData = useMemo(() => {
    const profiles = getAllProfiles();
    const accounts = getAllAccounts();
    
    // Get user's current school details
    const userSchool = realSchoolsMojokerto.find(s => s.id === currentProfile?.schoolId);
    
    // Default values if school not found
    const currentSchoolId = currentProfile?.schoolId || 'unknown';
    const currentRegency = userSchool?.regency || 'Kabupaten Mojokerto';
    const currentProvince = userSchool?.province || 'Jawa Timur';

    let filteredProfiles = profiles;

    if (activeTab === 'school') {
      filteredProfiles = profiles.filter(p => p.schoolId === currentSchoolId);
    } else if (activeTab === 'regency') {
      filteredProfiles = profiles.filter(p => {
        const s = realSchoolsMojokerto.find(sch => sch.id === p.schoolId);
        return s?.regency === currentRegency;
      });
    } else if (activeTab === 'province') {
      filteredProfiles = profiles.filter(p => {
        const s = realSchoolsMojokerto.find(sch => sch.id === p.schoolId);
        return s?.province === currentProvince;
      });
    }

    // Map to display format and sort
    const mapped = filteredProfiles.map(p => {
      const acc = accounts.find(a => a.id === p.userId);
      const s = realSchoolsMojokerto.find(sch => sch.id === p.schoolId);
      return {
        id: p.userId,
        name: acc?.name || 'Pengguna',
        totalPoints: p.totalPoints,
        schoolName: s?.name || p.schoolId,
        isCurrentUser: p.userId === currentProfile?.userId
      };
    });

    mapped.sort((a, b) => b.totalPoints - a.totalPoints);
    return mapped.slice(0, 10); // Top 10
  }, [activeTab, currentProfile]);

  return (
    <div className="glass rounded-2xl p-5 dark:bg-slate-900/60 mt-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Papan Peringkat
          </h3>
          <p className="text-sm text-ink-500 dark:text-slate-400 mt-1">
            Top 10 pahlawan tangguh bencana terbaik
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-brand-50 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('school')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'school'
                ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm'
                : 'text-ink-500 hover:text-ink-700 dark:text-slate-400'
            }`}
          >
            <School className="h-4 w-4" /> Sekolah
          </button>
          <button
            onClick={() => setActiveTab('regency')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'regency'
                ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm'
                : 'text-ink-500 hover:text-ink-700 dark:text-slate-400'
            }`}
          >
            <MapPin className="h-4 w-4" /> Kab/Kota
          </button>
          <button
            onClick={() => setActiveTab('province')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'province'
                ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm'
                : 'text-ink-500 hover:text-ink-700 dark:text-slate-400'
            }`}
          >
            <Map className="h-4 w-4" /> Provinsi
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {leaderboardData.length === 0 ? (
          <div className="py-8 text-center text-sm text-ink-500">
            Belum ada data untuk kategori ini.
          </div>
        ) : (
          leaderboardData.map((user, index) => (
            <div
              key={user.id}
              className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                user.isCurrentUser
                  ? 'border-brand-500 bg-brand-50/50 dark:border-brand-500/50 dark:bg-brand-900/20 shadow-sm'
                  : 'border-brand-100/50 bg-white/40 dark:border-slate-800 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800/80'
              }`}
            >
              <div className="w-8 shrink-0 text-center flex justify-center">
                {index === 0 ? <Trophy className="h-6 w-6 text-amber-500 drop-shadow-sm" /> :
                 index === 1 ? <Medal className="h-6 w-6 text-slate-400 drop-shadow-sm" /> :
                 index === 2 ? <Medal className="h-6 w-6 text-orange-600 drop-shadow-sm" /> :
                 <span className="font-bold text-ink-400 dark:text-slate-500">#{index + 1}</span>}
              </div>
              
              <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center font-bold text-brand-700 dark:text-brand-300">
                {user.name.substring(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-ink-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  {user.isCurrentUser && (
                    <span className="text-[10px] font-bold bg-brand-500 text-white px-2 py-0.5 rounded-full">
                      Anda
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-500 dark:text-slate-400 truncate">
                  {user.schoolName}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="font-display font-extrabold text-brand-600 dark:text-brand-400">
                  {user.totalPoints} <span className="text-xs font-medium text-ink-500">pts</span>
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
