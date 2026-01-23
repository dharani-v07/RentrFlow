import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CardBox from '../../components/CardBox.jsx';
import { useAuth } from '../../state/AuthContext.jsx';
import { getMyProfile, updateMyProfile } from '../../services/userService.js';

function TagInput({ label, value, onChange, placeholder }) {
  const [text, setText] = useState('');

  const tags = Array.isArray(value) ? value : [];

  function add(raw) {
    const v = String(raw || '').trim();
    if (!v) return;
    if (tags.includes(v)) return;
    onChange(tags.concat([v]));
    setText('');
  }

  function remove(v) {
    onChange(tags.filter((t) => t !== v));
  }

  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <div className="mt-1 border border-slate-200 rounded-md px-2 py-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-2 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
              {t}
              <button type="button" onClick={() => remove(t)} className="text-slate-500 hover:text-slate-900">
                ×
              </button>
            </span>
          ))}
          {tags.length === 0 ? <span className="text-xs text-slate-400">No items</span> : null}
        </div>

        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                add(text);
              }
            }}
            className="flex-1 outline-none text-sm"
            placeholder={placeholder}
          />
          <button type="button" onClick={() => add(text)} className="px-2.5 py-1.5 rounded bg-slate-900 text-white text-xs">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfileEditPage() {
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [bio, setBio] = useState('');

  const [skills, setSkills] = useState([]);
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [certifications, setCertifications] = useState([]);
  const [serviceAreas, setServiceAreas] = useState([]);
  const [availabilityStatus, setAvailabilityStatus] = useState('Available');

  const [organizationName, setOrganizationName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [managedPropertiesCount, setManagedPropertiesCount] = useState('');
  const [preferredContractorSkills, setPreferredContractorSkills] = useState([]);

  const isContractor = user?.role === 'contractor';
  const isAgent = user?.role === 'agent';

  const roleBadge = useMemo(() => (isAgent ? 'Agent' : isContractor ? 'Contractor' : '-'), [isAgent, isContractor]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getMyProfile();
        const p = data.profile;

        if (cancelled) return;

        setFullName(p.fullName || '');
        setPhoneNumber(p.phoneNumber || '');
        setCity(p.location?.city || '');
        setState(p.location?.state || '');
        setBio(p.bio || '');

        setSkills(p.contractorProfile?.skills || []);
        setYearsOfExperience(
          p.contractorProfile?.yearsOfExperience === 0 || p.contractorProfile?.yearsOfExperience
            ? String(p.contractorProfile.yearsOfExperience)
            : ''
        );
        setCertifications(p.contractorProfile?.certifications || []);
        setServiceAreas(p.contractorProfile?.serviceAreas || []);
        setAvailabilityStatus(p.contractorProfile?.availabilityStatus || 'Available');

        setOrganizationName(p.agentProfile?.organizationName || '');
        setRoleTitle(p.agentProfile?.roleTitle || '');
        setManagedPropertiesCount(
          p.agentProfile?.managedPropertiesCount === 0 || p.agentProfile?.managedPropertiesCount
            ? String(p.agentProfile.managedPropertiesCount)
            : ''
        );
        setPreferredContractorSkills(p.agentProfile?.preferredContractorSkills || []);
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

  function validate() {
    const fn = fullName.trim();
    if (!fn) return 'Full name is required';
    if (fn.length > 80) return 'Full name is too long';

    if (phoneNumber && phoneNumber.length > 30) return 'Phone number is too long';
    if (city && city.length > 60) return 'City is too long';
    if (state && state.length > 60) return 'State is too long';
    if (bio && bio.length > 500) return 'Bio is too long';

    if (isContractor) {
      if (yearsOfExperience !== '') {
        const n = Number(yearsOfExperience);
        if (Number.isNaN(n)) return 'Years of experience must be a number';
        if (n < 0) return 'Years of experience must be >= 0';
      }
    }

    if (isAgent) {
      if (managedPropertiesCount !== '') {
        const n = Number(managedPropertiesCount);
        if (Number.isNaN(n)) return 'Managed properties count must be a number';
        if (n < 0) return 'Managed properties count must be >= 0';
      }
    }

    return '';
  }

  async function onSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        bio: bio.trim(),
        location: { city: city.trim(), state: state.trim() },
      };

      if (isContractor) {
        payload.contractorProfile = {
          skills,
          certifications,
          serviceAreas,
          availabilityStatus,
          yearsOfExperience: yearsOfExperience === '' ? undefined : Number(yearsOfExperience),
        };
      }

      if (isAgent) {
        payload.agentProfile = {
          organizationName: organizationName.trim(),
          roleTitle: roleTitle.trim(),
          managedPropertiesCount: managedPropertiesCount === '' ? undefined : Number(managedPropertiesCount),
          preferredContractorSkills,
        };
      }

      await updateMyProfile(payload);
      await refreshMe().catch(() => null);
      setSuccess('Profile updated successfully');

      setTimeout(() => {
        navigate('/app/profile');
      }, 400);
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-slate-600">Loading...</div>;

  return (
    <div className="space-y-6">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {success ? <div className="text-sm text-green-700">{success}</div> : null}

      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-bold text-slate-800">Edit Profile</div>
          <div className="text-sm text-slate-500">Role: {roleBadge}</div>
        </div>
        <button type="button" onClick={() => navigate('/app/profile')} className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm">
          Cancel
        </button>
      </div>

      <CardBox title="Profile Information">
        <form onSubmit={onSave} className="space-y-5">
          <div>
            <label className="text-sm text-slate-600">Email (read-only)</label>
            <input value={user?.email || ''} disabled className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 bg-slate-50 text-slate-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2" required />
            </div>
            <div>
              <label className="text-sm text-slate-600">Phone Number</label>
              <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="text-sm text-slate-600">State</label>
              <input value={state} onChange={(e) => setState(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2" />
          </div>

          <div>
            <label className="text-sm text-slate-600">Resume (PDF)</label>
            <div className="mt-1 text-xs text-slate-500">
              Resume upload is available in the Profile page.
            </div>
          </div>

          {isContractor ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600">Availability Status</label>
                  <select value={availabilityStatus} onChange={(e) => setAvailabilityStatus(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2">
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                    <option value="Unavailable">Unavailable</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-600">Years of Experience</label>
                  <input value={yearsOfExperience} onChange={(e) => setYearsOfExperience(e.target.value)} inputMode="numeric" className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2" />
                </div>
              </div>

              <TagInput label="Skills" value={skills} onChange={setSkills} placeholder="Type a skill and press Enter" />
              <TagInput label="Certifications" value={certifications} onChange={setCertifications} placeholder="Type a certification and press Enter" />
              <TagInput label="Service Areas" value={serviceAreas} onChange={setServiceAreas} placeholder="Type a city/area and press Enter" />
            </div>
          ) : null}

          {isAgent ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600">Organization Name</label>
                  <input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm text-slate-600">Role Title</label>
                  <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2" />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600">Managed Properties Count</label>
                <input value={managedPropertiesCount} onChange={(e) => setManagedPropertiesCount(e.target.value)} inputMode="numeric" className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2" />
              </div>

              <TagInput
                label="Preferred Contractor Skills"
                value={preferredContractorSkills}
                onChange={setPreferredContractorSkills}
                placeholder="Type a skill and press Enter"
              />
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-[#1e5aa0] text-white text-sm disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => navigate('/app/profile')} className="text-sm text-slate-600">
              Cancel
            </button>
          </div>
        </form>
      </CardBox>
    </div>
  );
}
