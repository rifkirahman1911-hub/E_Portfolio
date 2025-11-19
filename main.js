// main.js
import supabase from './supabaseClient.js';

/* =========================
   HELPERS
   ========================= */
function ok() { return { success: true }; }
function fail(msg) { return { success: false, error: msg || 'unknown' }; }

/* =========================
   AUTH
   - register/login return {success, error}  (no redirect inside)
   ========================= */
export async function register(email, password, fullName) {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return fail(error.message || String(error));

    // create profile row (dev env - assumes profiles table exists)
    const res = await supabase.from('profiles').insert([{
      user_id: data.user.id,
      email,
      full_name: fullName
    }]);

    if (res.error) {
      console.error('profiles insert error', res.error);
      return fail(res.error.message || String(res.error));
    }

    return ok();
  } catch (err) {
    console.error('register exception', err);
    return fail(err.message || String(err));
  }
}

export async function login(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return fail(error.message || String(error));

    // store user id locally for convenience
    try {
      localStorage.setItem('userId', data.user.id);
    } catch(e){ /* ignore */ }

    return ok();
  } catch (err) {
    console.error('login exception', err);
    return fail(err.message || String(err));
  }
}

/* =========================
   SESSION CHECK / LOGOUT
   ========================= */
export async function checkLogin() {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data || !data.user) {
      return { loggedIn: false };
    }
    // store user id
    try { localStorage.setItem('userId', data.user.id); } catch(e){}
    return { loggedIn: true, user: data.user };
  } catch (err) {
    console.error('checkLogin', err);
    return { loggedIn: false };
  }
}

export async function logout() {
  try {
    await supabase.auth.signOut();
    try { localStorage.removeItem('userId'); } catch(e){}
    return ok();
  } catch (err) {
    console.error('logout error', err);
    return fail(err.message || String(err));
  }
}

/* =========================
   PROFILE
   ========================= */
export async function getProfile() {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
    if (error) {
      console.error('getProfile error', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('getProfile exception', err);
    return null;
  }
}

export async function updateProfile(fullName, phone, bio, skills = [], interests = []) {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return fail('Not authenticated');
    const { data: profile, error: findErr } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
    if (findErr || !profile) return fail('Profile not found');

    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      phone,
      bio,
      skills,
      interests
    }).eq('id', profile.id);

    if (error) return fail(error.message || String(error));
    return ok();
  } catch (err) {
    console.error('updateProfile', err);
    return fail(err.message || String(err));
  }
}

/* =========================
   PROJECTS CRUD
   ========================= */
export async function addProject(title, description, project_type, demo_link = null) {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return fail('Not authenticated');

    const fetchProfile = await supabase.from('profiles').select('id').eq('user_id', userId).single();
    if (fetchProfile.error || !fetchProfile.data) return fail('Profile not found');

    const { error } = await supabase.from('projects').insert([{
      profile_id: fetchProfile.data.id,
      title,
      description,
      project_type,
      demo_link,
      created_at: new Date()
    }]);

    if (error) return fail(error.message || String(error));
    return ok();
  } catch (err) {
    console.error('addProject', err);
    return fail(err.message || String(err));
  }
}

export async function getProjects() {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return [];
    const fetchProfile = await supabase.from('profiles').select('id').eq('user_id', userId).single();
    if (fetchProfile.error || !fetchProfile.data) return [];
    const { data, error } = await supabase.from('projects').select('*').eq('profile_id', fetchProfile.data.id).order('created_at', { ascending: false });
    if (error) {
      console.error('getProjects error', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('getProjects exception', err);
    return [];
  }
}

export async function updateProject(projectId, title, description, project_type, demo_link = null) {
  try {
    const { error } = await supabase.from('projects').update({
      title, description, project_type, demo_link
    }).eq('id', projectId);

    if (error) return fail(error.message || String(error));
    return ok();
  } catch (err) {
    console.error('updateProject', err);
    return fail(err.message || String(err));
  }
}

export async function deleteProject(projectId) {
  try {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) return fail(error.message || String(error));
    return ok();
  } catch (err) {
    console.error('deleteProject', err);
    return fail(err.message || String(err));
  }
}

/* =========================
   CERTIFICATES CRUD
   ========================= */
export async function addCertificate(name, issuer, issued_date = null, file_url = null) {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return fail('Not authenticated');

    const fetchProfile = await supabase.from('profiles').select('id').eq('user_id', userId).single();
    if (fetchProfile.error || !fetchProfile.data) return fail('Profile not found');

    const { error } = await supabase.from('certificates').insert([{
      profile_id: fetchProfile.data.id,
      name, issuer, issued_date, file_url, created_at: new Date()
    }]);

    if (error) return fail(error.message || String(error));
    return ok();
  } catch (err) {
    console.error('addCertificate', err);
    return fail(err.message || String(err));
  }
}

export async function getCertificates() {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return [];
    const fetchProfile = await supabase.from('profiles').select('id').eq('user_id', userId).single();
    if (fetchProfile.error || !fetchProfile.data) return [];
    const { data, error } = await supabase.from('certificates').select('*').eq('profile_id', fetchProfile.data.id).order('issued_date', { ascending: false });
    if (error) {
      console.error('getCertificates error', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('getCertificates exception', err);
    return [];
  }
}

export async function deleteCertificate(certId) {
  try {
    const { error } = await supabase.from('certificates').delete().eq('id', certId);
    if (error) return fail(error.message || String(error));
    return ok();
  } catch (err) {
    console.error('deleteCertificate', err);
    return fail(err.message || String(err));
  }
}

/* =========================
   ASSESSMENTS CRUD
   ========================= */
export async function addAssessment(skill_name, score, evaluator = '') {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return fail('Not authenticated');

    const fetchProfile = await supabase.from('profiles').select('id').eq('user_id', userId).single();
    if (fetchProfile.error || !fetchProfile.data) return fail('Profile not found');

    const { error } = await supabase.from('assessments').insert([{
      profile_id: fetchProfile.data.id,
      skill_name,
      score,
      evaluator,
      created_at: new Date()
    }]);

    if (error) return fail(error.message || String(error));
    return ok();
  } catch (err) {
    console.error('addAssessment', err);
    return fail(err.message || String(err));
  }
}

export async function getAssessments() {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return [];
    const fetchProfile = await supabase.from('profiles').select('id').eq('user_id', userId).single();
    if (fetchProfile.error || !fetchProfile.data) return [];
    const { data, error } = await supabase.from('assessments').select('*').eq('profile_id', fetchProfile.data.id).order('created_at', { ascending: false });
    if (error) {
      console.error('getAssessments error', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('getAssessments exception', err);
    return [];
  }
}

export async function deleteAssessment(id) {
  try {
    const { error } = await supabase.from('assessments').delete().eq('id', id);
    if (error) return fail(error.message || String(error));
    return ok();
  } catch (err) {
    console.error('deleteAssessment', err);
    return fail(err.message || String(err));
  }
}

/* =========================
   SHARE LINK (portfolio)
   ========================= */
export async function createPortfolioLink() {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return fail('Not authenticated');

    const { data: profile } = await supabase.from('profiles').select('id, full_name').eq('user_id', userId).single();
    if (!profile) return fail('Profile not found');

    // generate slug from name + random
    const base = (profile.full_name || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const rand = Math.random().toString(36).slice(2,7);
    const slug = `${base}-${rand}`;

    const { data, error } = await supabase.from('portfolio_links').insert([{
      profile_id: profile.id,
      public_url: slug,
      created_at: new Date()
    }]).select().single();

    if (error) return fail(error.message || String(error));
    const publicUrl = data.public_url;
    return { success: true, url: `${location.origin}/portfolio.html?u=${publicUrl}`, slug: publicUrl };
  } catch (err) {
    console.error('createPortfolioLink', err);
    return fail(err.message || String(err));
  }
}

/* =========================
   CV GENERATOR
   produce an HTML preview in new tab
   ========================= */
export async function generateCV() {
  try {
    const profile = await getProfile();
    const projects = await getProjects();
    const certs = await getCertificates();
    const assessments = await getAssessments();

    let html = `
      <html><head><title>CV - ${profile?.full_name || ''}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#222}
        h1{margin-bottom:4px}
        h2{margin-top:18px}
        .meta{color:#555;margin-bottom:10px}
        ul{margin-top:8px}
        .proj{margin-bottom:10px}
        a{color:#1a73e8}
        table{border-collapse:collapse;width:100%;margin-top:8px}
        td,th{border:1px solid #ddd;padding:8px}
      </style>
      </head><body>
      <h1>${profile?.full_name || 'Nama'}</h1>
      <div class="meta">${profile?.bio || ''}</div>

      <h2>Projects</h2>
      <ul>
    `;

    projects.forEach(p => {
      html += `<li class="proj"><strong>${p.title}</strong> — ${p.project_type || ''} ${p.demo_link ? `(<a href="${p.demo_link}" target="_blank">${p.demo_link}</a>)` : ''}<div>${p.description || ''}</div></li>`;
    });

    html += `</ul><h2>Certificates</h2><ul>`;
    certs.forEach(c => {
      html += `<li><strong>${c.name}</strong> — ${c.issuer || ''} ${c.issued_date ? `(${c.issued_date})` : ''}</li>`;
    });

    html += `</ul><h2>Assessments</h2><table><tr><th>Skill</th><th>Score</th><th>Evaluator</th></tr>`;
    assessments.forEach(a => {
      html += `<tr><td>${a.skill_name}</td><td>${a.score}</td><td>${a.evaluator || ''}</td></tr>`;
    });
    html += `</table></body></html>`;

    const w = window.open('', '_blank');
    w.document.open();
    w.document.write(html);
    w.document.close();

    // optional: log to cv_generator_logs table
    await supabase.from('cv_generator_logs').insert([{
      profile_id: profile.id,
      ai_summary: null,
      generated_url: null,
      created_at: new Date()
    }]);

    return ok();
  } catch (err) {
    console.error('generateCV', err);
    return fail(err.message || String(err));
  }
}
