// src/controllers/public/models.controller.js
import cloudinary from '../../config/cloudinary.js'

export async function listModels(req, res) {
  try {
    const { next, prefix: qPrefix, tag: qTag } = req.query
    const defaultPrefix = process.env.CLOUDINARY_MODELS_PREFIX ?? 'steezemodels/'
    const defaultTag = process.env.CLOUDINARY_MODELS_TAG
    const prefix = typeof qPrefix === 'string' ? qPrefix : defaultPrefix
    const tag = typeof qTag === 'string' ? qTag : defaultTag

    let urls = []
    let nextCursor = null

    // 1) If tag provided, prefer listing by tag
    if (tag) {
      try {
        const byTag = await cloudinary.api.resources_by_tag(tag, {
          resource_type: 'image',
          max_results: 100,
          next_cursor: next,
        })
        urls = (byTag.resources || []).map(r => r.secure_url)
        nextCursor = byTag.next_cursor || null
      } catch (e) {
        console.warn('Cloudinary tag listing failed:', tag, e?.message)
      }
    }

    // 2) If no tag results (or no tag), try folder prefix
    if (!urls.length) {
      const options = {
        type: 'upload',
        resource_type: 'image',
        max_results: 100,
        next_cursor: next,
      }
      if (prefix) options.prefix = prefix
      try {
        const byPrefix = await cloudinary.api.resources(options)
        urls = (byPrefix.resources || []).map(r => r.secure_url)
        nextCursor = byPrefix.next_cursor || null
      } catch (e) {
        console.warn('Cloudinary prefix listing failed:', prefix, e?.message)
      }
    }

    // 3) Fallback: Cloudinary Search API (if enabled)
    if (!urls.length && prefix) {
      try {
        const folder = String(prefix).replace(/\/$/, '')
        const search = await cloudinary.search
          .expression(`folder:${folder}/* AND resource_type:image`)
          .sort_by('created_at', 'desc')
          .max_results(100)
          .execute()
        urls = (search.resources || []).map(r => r.secure_url)
        nextCursor = search.next_cursor || null
      } catch (e) {
        console.warn('Cloudinary search fallback failed:', e?.message)
      }
    }

    // Prevent conditional GET 304 for XHR consumers
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    })
    res.status(200).json({ urls, next: nextCursor })
  } catch (e) {
    console.error('listModels error:', e)
    res.status(500).json({ error: 'Failed to list images' })
  }
}
