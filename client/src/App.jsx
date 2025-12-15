import { useState } from 'react';
import { Download, Image, X, Plus, Link } from 'lucide-react';
import Logo from './assets/logo.png'

export default function TwitterMediaDownloader() {
  const [urls, setUrls] = useState(['']);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const removeUrlField = (index) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls.length > 0 ? newUrls : ['']);
  };

  const updateUrl = (index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const extractTweetId = (url) => {
    const patterns = [
      /twitter\.com\/\w+\/status\/(\d+)/,
      /x\.com\/\w+\/status\/(\d+)/,
      /\/status\/(\d+)/,
      /^(\d+)$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  const getFileNameFromUrl = (url, type, tweetId, index) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      if (pathname.includes('/media/') || pathname.includes('/ext_tw_video/')) {
        const parts = pathname.split('/');
        const lastPart = parts[parts.length - 1];
        const fileName = lastPart.split('?')[0];

        if (fileName && fileName.includes('.')) {
          return fileName;
        }
      }

      const timestamp = Date.now();
      return `twitter_${tweetId}_${index}_${timestamp}.${type === 'image' ? 'jpg' : 'mp4'}`;
    } catch {
      const timestamp = Date.now();
      return `twitter_${tweetId}_${timestamp}.${type === 'image' ? 'jpg' : 'mp4'}`;
    }
  };

  const downloadFile = async (url, fileName) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);

      return true;
    } catch (err) {
      console.error('Download failed:', err);
      return false;
    }
  };

  const extractMedia = async () => {
    setError('');
    setMedia([]);
    setLoading(true);
    setProcessingStatus('Extracting media...');

    const validUrls = urls.filter(url => url.trim() !== '');

    if (validUrls.length === 0) {
      setError('Please enter at least one tweet URL.');
      setLoading(false);
      return;
    }

    const extractedMedia = [];
    let successCount = 0;

    for (let i = 0; i < validUrls.length; i++) {
      const url = validUrls[i];
      const tweetId = extractTweetId(url);

      if (!tweetId) continue;

      setProcessingStatus(`Extracting ${i + 1}/${validUrls.length}`);

      try {
        const response = await fetch(`https://api.vxtwitter.com/Twitter/status/${tweetId}`);
        const data = await response.json();

        if (data.media_extended) {
          const mediaItems = data.media_extended.map((m, index) => {
            const downloadUrl = m.type === 'image'
              ? m.url.replace(/&name=\w+/, '&name=orig')
              : m.url;

            const fileName = getFileNameFromUrl(downloadUrl, m.type, tweetId, index);

            if (m.type === 'image') {
              return {
                type: 'image',
                url: m.url,
                downloadUrl: downloadUrl,
                fileName: fileName,
                tweetId: tweetId
              };
            } else if (m.type === 'video' || m.type === 'gif') {
              return {
                type: 'video',
                downloadUrl: downloadUrl,
                thumbnail: m.thumbnail_url,
                fileName: fileName,
                tweetId: tweetId
              };
            }
            return null;
          }).filter(Boolean);

          extractedMedia.push(...mediaItems);
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to extract tweet ${tweetId}:`, err);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (extractedMedia.length === 0) {
      setError('No media found in the provided URLs.');
    } else {
      setMedia(extractedMedia);
    }

    setProcessingStatus('');
    setLoading(false);
  };

  const downloadAllMedia = async () => {
    if (media.length === 0) {
      await downloadDirectly();
      return;
    }

    setLoading(true);
    setProcessingStatus('Downloading...');

    let downloadedCount = 0;

    for (let i = 0; i < media.length; i++) {
      setProcessingStatus(`Downloading ${i + 1}/${media.length}`);

      try {
        await downloadFile(media[i].downloadUrl, media[i].fileName);
        downloadedCount++;
      } catch (err) {
        console.error('Download failed:', err);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setProcessingStatus(`Downloaded ${downloadedCount} files`);
    setLoading(false);

    setTimeout(() => {
      setProcessingStatus('');
    }, 3000);
  };

  const downloadDirectly = async () => {
    setError('');
    setMedia([]);
    setLoading(true);
    setProcessingStatus('Downloading directly...');

    const validUrls = urls.filter(url => url.trim() !== '');

    if (validUrls.length === 0) {
      setError('Please enter at least one tweet URL.');
      setLoading(false);
      return;
    }

    let downloadedCount = 0;

    for (let i = 0; i < validUrls.length; i++) {
      const url = validUrls[i];
      const tweetId = extractTweetId(url);

      if (!tweetId) continue;

      setProcessingStatus(`Processing ${i + 1}/${validUrls.length}`);

      try {
        const response = await fetch(`https://api.vxtwitter.com/Twitter/status/${tweetId}`);
        const data = await response.json();

        if (data.media_extended) {
          for (let j = 0; j < data.media_extended.length; j++) {
            const mediaItem = data.media_extended[j];

            const downloadUrl = mediaItem.type === 'image'
              ? mediaItem.url.replace(/&name=\w+/, '&name=orig')
              : mediaItem.url;

            const fileName = getFileNameFromUrl(downloadUrl, mediaItem.type, tweetId, j);

            await downloadFile(downloadUrl, fileName);
            downloadedCount++;

            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } catch (err) {
        console.error(`Failed to process tweet ${tweetId}:`, err);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setLoading(false);

    if (downloadedCount > 0) {
      setProcessingStatus(`Downloaded ${downloadedCount} files`);

      setTimeout(() => {
        setProcessingStatus('');
      }, 3000);
    } else {
      setError('No media could be downloaded.');
      setProcessingStatus('');
    }
  };

  const downloadSingle = async (item) => {
    try {
      await downloadFile(item.downloadUrl, item.fileName);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const resetAll = () => {
    setUrls(['']);
    setMedia([]);
    setProcessingStatus('');
    setError('');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Main Card */}
        <div className="bg-gray-800 rounded-xl p-8 shadow-2xl border border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white-600 rounded-xl mb-4">
                <img src={Logo} alt="Logo" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Twitter Media Downloader</h1>
            <p className="text-gray-400">Download media from tweets</p>
          </div>

          {/* URL Input Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-300">
                <Link className="w-4 h-4" />
                <span className="font-medium">Tweet URLs</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addUrlField}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add URL
                </button>
                <button
                  onClick={resetAll}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {urls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    placeholder="https://twitter.com/username/status/..."
                    className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-all"
                  />
                  {urls.length > 1 && (
                    <button
                      onClick={() => removeUrlField(index)}
                      className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-400 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons - All in one row */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={extractMedia}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && processingStatus.includes('Extract') ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Extracting...
                </>
              ) : (
                'Extract Media'
              )}
            </button>

            <button
              onClick={downloadAllMedia}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && processingStatus.includes('Download') ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download All
                </>
              )}
            </button>
          </div>

          {/* Status Messages */}
          {processingStatus && (
            <div className="mb-4 p-3 bg-gray-900 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-2 text-gray-300">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm">{processingStatus}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Extracted Media Preview */}
          {media.length > 0 && (
            <div className="mt-6 border-t border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {media.length} Media Found
                </h3>
                <div className="text-sm text-gray-400">
                  {media.filter(m => m.type === 'image').length} Images • {media.filter(m => m.type === 'video').length} Videos
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {media.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors"
                  >
                    {item.type === 'image' ? (
                      <div className="w-full h-32 bg-gray-800">
                        <img
                          src={item.url}
                          alt={`Image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="relative w-full h-32 bg-gray-800">
                        <img
                          src={item.thumbnail}
                          alt={`Video ${index + 1}`}
                          className="w-full h-full object-cover opacity-70"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black bg-opacity-50 rounded-full p-2">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="p-3">
                      <button
                        onClick={() => downloadSingle(item)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-md transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Developer Credit */}
          <div className="mt-8 pt-6 border-t border-gray-700 text-center">
            <p className="text-gray-500 text-sm">
              Developer by{' '}
              <a
                href="https://mdanaskhan.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                AN AS
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}