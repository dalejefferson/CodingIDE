import { useState, useRef, useCallback } from 'react'

interface ImageUploadAreaProps {
  images: string[]
  onAdd: (paths: string[]) => void
  onRemove: (index: number) => void
  maxImages?: number
}

const DEFAULT_MAX = 10

export function ImageUploadArea({
  images,
  onAdd,
  onRemove,
  maxImages = DEFAULT_MAX,
}: ImageUploadAreaProps) {
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remaining = maxImages - images.length

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      const paths: string[] = []
      const limit = Math.min(files.length, remaining)
      for (let i = 0; i < limit; i++) {
        const file = files[i]
        // Electron gives us the real path via .path on File objects
        const filePath = (file as File & { path?: string }).path
        if (filePath) {
          paths.push(filePath)
        }
      }
      if (paths.length > 0) onAdd(paths)
    },
    [remaining, onAdd],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files)
      // Reset so the same file can be picked again
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [addFiles],
  )

  return (
    <div className="image-upload-area">
      <div
        className={`image-upload-dropzone${dragging ? ' image-upload-dropzone--active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="presentation"
      >
        <span className="image-upload-dropzone__text">
          {remaining > 0 ? 'Drop images here or' : `Maximum ${maxImages} images reached`}
        </span>
        {remaining > 0 && (
          <button
            type="button"
            className="create-app-btn create-app-btn-cancel image-upload-browse-btn"
            onClick={handleBrowse}
            style={{ fontFamily: 'inherit' }}
          >
            Browse
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <span className="image-upload-hint">Max {maxImages} images</span>
      </div>

      {images.length > 0 && (
        <div className="image-upload-thumbnails">
          {images.map((imgPath, index) => (
            <div key={`${imgPath}-${index}`} className="image-thumbnail">
              <img
                src={`file://${imgPath}`}
                alt={`Reference ${index + 1}`}
                className="image-thumbnail__img"
              />
              <button
                type="button"
                className="image-thumbnail-remove"
                onClick={() => onRemove(index)}
                title="Remove image"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
