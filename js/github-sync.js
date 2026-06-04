/**
 * GitHub Integration & Data Sync Helper for Vector Academy
 */

const GITHUB_SETTINGS_KEY = 'vector_github_settings';

// UTF-8 safe Base64 encoder (handles Japanese characters)
function utf8ToBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

// UTF-8 safe Base64 decoder
function base64ToUtf8(base64) {
    return decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

// Get GitHub settings
function getGitHubSettings() {
    try {
        const settings = localStorage.getItem(GITHUB_SETTINGS_KEY);
        if (settings) {
            const parsed = JSON.parse(settings);
            if (parsed && parsed.token) {
                // トークンから英数字とアンダースコア以外のゴミ文字を強制的に排除
                parsed.token = parsed.token.replace(/[^a-zA-Z0-9_]/g, '');
            }
            return parsed;
        }
    } catch (e) {
        console.error('Error reading GitHub settings:', e);
    }
    return { owner: '', repo: '', branch: 'main', token: '' };
}

// Save GitHub settings
function saveGitHubSettings(settings) {
    localStorage.setItem(GITHUB_SETTINGS_KEY, JSON.stringify(settings));
}

// Check if integrated
function isGitHubIntegrated() {
    const s = getGitHubSettings();
    return !!(s.owner && s.repo && s.token);
}

// Push file to GitHub using the REST API
async function pushToGitHub(path, content, commitMessage) {
    const settings = getGitHubSettings();
    if (!isGitHubIntegrated()) {
        throw new Error('GitHub Integration is not configured.');
    }

    const { owner, repo, branch, token } = settings;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    // 1. Try to get existing file SHA
    let sha = null;
    try {
        const getRes = await fetch(`${apiUrl}?ref=${branch}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Cache-Control': 'no-cache'
            }
        });
        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        } else if (getRes.status !== 404) {
            const errData = await getRes.json().catch(() => ({}));
            throw new Error(`GitHub API returned ${getRes.status}: ${errData.message || 'Cannot retrieve file metadata'}`);
        }
    } catch (e) {
        if (e.message.includes('GitHub API returned')) {
            throw e;
        }
        console.warn('Failed to retrieve file SHA (file might be new):', e);
    }

    // 2. Perform the PUT commit request
    const body = {
        message: commitMessage,
        content: utf8ToBase64(content),
        branch: branch
    };
    if (sha) {
        body.sha = sha;
    }

    const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!putRes.ok) {
        const errorData = await putRes.json();
        throw new Error(errorData.message || 'Failed to commit to GitHub.');
    }

    return await putRes.json();
}

// Helper to fetch files with cache-busting
async function fetchWithCacheBusting(url) {
    // Append a unique timestamp to prevent browser cache
    const separator = url.includes('?') ? '&' : '?';
    const cacheBustedUrl = `${url}${separator}t=${new Date().getTime()}`;
    const response = await fetch(cacheBustedUrl, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
}

// Dirty State Flags Management
const DIRTY_FLAGS = {
    news: 'vector_news_dirty',
    exams: 'vector_exam_news_dirty',
    universities: 'vector_universities_dirty',
    faq: 'vector_faq_dirty'
};

function setDirty(type, isDirty) {
    const key = DIRTY_FLAGS[type];
    if (key) {
        localStorage.setItem(key, isDirty ? 'true' : 'false');
    }
}

function isDirty(type) {
    const key = DIRTY_FLAGS[type];
    return localStorage.getItem(key) === 'true';
}
