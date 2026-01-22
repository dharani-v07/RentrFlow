import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import CardBox from '../../components/CardBox.jsx';
import { useAuth } from '../../state/AuthContext.jsx';
import { getMyProfile } from '../../services/userService.js';

function chips(values) {
  const list = Array.isArray(values) ? values.filter(Boolean) : [];
  if (list.length === 0) return <span className="text-slate-500">-</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {list.map((v) => (
        <span key={v} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
          {v}
        </span>
      ))}
    </div>
  );
}

export default function ProfileViewPage() {
  const { user } = useAuth();

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const roleLabel = useMemo(() => {
    if (user?.role === 'agent') return 'Agent';
    if (user?.role === 'contractor') return 'Contractor';
    return '-';
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getMyProfile();
        if (!cancelled) setProfile(data.profile);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="text-slate-600">Loading...</div>;

  return (
    <div className="space-y-6">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-bold text-slate-800">Profile</div>
          <div className="text-sm text-slate-500">View your account details</div>
        </div>
        <Link to="/app/profile/edit" className="px-4 py-2 rounded-md bg-[#1e5aa0] text-white text-sm">
          Edit Profile
        </Link>
      </div>

      <CardBox title="Profile Overview">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-[220px] flex flex-col items-center md:items-start gap-3">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
              {profile?.profileImage ? (
                <img
                  src={profile.profileImage.startsWith('/uploads/') ? `${apiBase}${profile.profileImage}` : profile.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-slate-400 text-3xl font-bold">
                  {String(profile?.fullName || profile?.name || user?.name || 'U').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div className="text-center md:text-left">
              <div className="font-bold text-slate-900">{profile?.fullName || profile?.name || '-'}</div>
              <div className="text-sm text-slate-500">{profile?.email || '-'}</div>
              <div className="mt-2 inline-flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded bg-slate-900 text-white">{roleLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            <div>
              <div className="text-slate-500">Phone Number</div>
              <div className="font-semibold text-slate-800">{profile?.phoneNumber || '-'}</div>
            </div>

            <div>
              <div className="text-slate-500">Location</div>
              <div className="font-semibold text-slate-800">
                {[profile?.location?.city, profile?.location?.state].filter(Boolean).join(', ') || '-'}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-slate-500">Bio</div>
              <div className="text-slate-800">{profile?.bio || <span className="text-slate-500">-</span>}</div>
            </div>
          </div>
        </div>
      </CardBox>

      {user?.role === 'contractor' ? (
        <CardBox title="Contractor Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            <div>
              <div className="text-slate-500">Availability</div>
              <div className="font-semibold text-slate-800">{profile?.contractorProfile?.availabilityStatus || '-'}</div>
            </div>

            <div>
              <div className="text-slate-500">Years of Experience</div>
              <div className="font-semibold text-slate-800">
                {profile?.contractorProfile?.yearsOfExperience ?? <span className="text-slate-500">-</span>}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-slate-500">Skills</div>
              {chips(profile?.contractorProfile?.skills)}
            </div>

            <div className="md:col-span-2">
              <div className="text-slate-500">Certifications</div>
              {chips(profile?.contractorProfile?.certifications)}
            </div>

            <div className="md:col-span-2">
              <div className="text-slate-500">Service Areas</div>
              {chips(profile?.contractorProfile?.serviceAreas)}
            </div>
          </div>
        </CardBox>
      ) : null}

      {user?.role === 'agent' ? (
        <CardBox title="Agent Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            <div>
              <div className="text-slate-500">Organization Name</div>
              <div className="font-semibold text-slate-800">{profile?.agentProfile?.organizationName || '-'}</div>
            </div>

            <div>
              <div className="text-slate-500">Role Title</div>
              <div className="font-semibold text-slate-800">{profile?.agentProfile?.roleTitle || '-'}</div>
            </div>

            <div>
              <div className="text-slate-500">Managed Properties</div>
              <div className="font-semibold text-slate-800">
                {profile?.agentProfile?.managedPropertiesCount ?? <span className="text-slate-500">-</span>}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-slate-500">Preferred Contractor Skills</div>
              {chips(profile?.agentProfile?.preferredContractorSkills)}
            </div>
          </div>
        </CardBox>
      ) : null}
    </div>
  );
}
