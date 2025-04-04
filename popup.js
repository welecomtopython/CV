document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const resourcesTable = document.getElementById("resourcesTable")
  const resourcesTableBody = document.getElementById("resourcesTableBody")
  const loadingElement = document.getElementById("loading")
  const noResourcesElement = document.getElementById("noResources")
  const resourceCountElement = document.getElementById("resourceCount")
  const importBtn = document.getElementById("importBtn")
  const showImagesCheckbox = document.getElementById("showImages")
  const showFilesCheckbox = document.getElementById("showFiles")

  let allResources = []

  // Function to get all resources from the current tab
  function getResourcesFromPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          function: findResources,
        },
        (results) => {
          loadingElement.classList.add("hidden")

          if (results && results[0].result.length > 0) {
            allResources = results[0].result
            resourcesTable.classList.remove("hidden")
            displayResources()
          } else {
            noResourcesElement.classList.remove("hidden")
            resourceCountElement.textContent = "0 resources found"
          }
        },
      )
    })
  }

  // Function that runs in the context of the webpage to find all resources
  function findResources() {
    const resources = []

    // Find all images
    const images = Array.from(document.querySelectorAll("img"))
    images.forEach((img) => {
      if (img.src && img.src.trim() !== "" && !img.src.startsWith("data:")) {
        resources.push({
          type: "image",
          src: img.src,
          filename: img.src.split("/").pop().split("?")[0] || "image.jpg",
          extension: getExtensionFromUrl(img.src),
        })
      }
    })

    // Find all file links
    const links = Array.from(document.querySelectorAll("a"))

    links.forEach((link) => {
      const href = link.href
      if (href && href.trim() !== "" && !href.startsWith("javascript:") && !href.endsWith("/")) {
        const filename = href.split("/").pop().split("?")[0]
        const extension = getExtensionFromUrl(href)

        if (extension && extension !== "") {
          resources.push({
            type: "file",
            src: link.href,
            extension: extension,
            filename: filename,
          })
        }
      }
    })

    return resources

    // Helper function to get file extension from URL
    function getExtensionFromUrl(url) {
      try {
        const filename = url.split("/").pop().split("?")[0]
        const parts = filename.split(".")
        if (parts.length > 1) {
          return "." + parts.pop().toLowerCase()
        }
      } catch (e) {}
      return ""
    }
  }

  // Function to display resources in the table
  function displayResources() {
    resourcesTableBody.innerHTML = ""

    const showImages = showImagesCheckbox.checked
    const showFiles = showFilesCheckbox.checked

    const filteredResources = allResources.filter(
      (resource) => (resource.type === "image" && showImages) || (resource.type === "file" && showFiles),
    )

    // Update resource count
    resourceCountElement.textContent = `${filteredResources.length} resources found`

    if (filteredResources.length === 0) {
      resourcesTable.classList.add("hidden")
      noResourcesElement.classList.remove("hidden")
      return
    } else {
      resourcesTable.classList.remove("hidden")
      noResourcesElement.classList.add("hidden")
    }

    filteredResources.forEach((resource) => {
      const row = document.createElement("tr")

      // Type cell with icon
      const typeCell = document.createElement("td")
      if (resource.type === "image") {
        const imgElement = document.createElement("img")
        imgElement.src = resource.src
        imgElement.className = "image-preview"
        typeCell.appendChild(imgElement)
      } else {
        const fileIcon = document.createElement("div")
        fileIcon.className = "file-icon"
        fileIcon.textContent = getFileTypeDisplay(resource.extension)
        typeCell.appendChild(fileIcon)
      }

      // Name cell
      const nameCell = document.createElement("td")
      nameCell.className = "name-cell"
      nameCell.title = resource.src
      nameCell.textContent = resource.filename

      // Format cell
      const formatCell = document.createElement("td")
      formatCell.textContent = resource.type === "image" ? "Image" : resource.extension.replace(".", "").toUpperCase()

      // Action cell
      const actionCell = document.createElement("td")
      const downloadBtn = document.createElement("button")
      downloadBtn.className = "download-btn"
      downloadBtn.textContent = "Download"
      downloadBtn.addEventListener("click", () => {
        downloadResource(resource.src, resource.filename)
      })
      actionCell.appendChild(downloadBtn)

      // Add cells to row
      row.appendChild(typeCell)
      row.appendChild(nameCell)
      row.appendChild(formatCell)
      row.appendChild(actionCell)

      // Add row to table
      resourcesTableBody.appendChild(row)
    })
  }

  // Function to get file type display text
  function getFileTypeDisplay(extension) {
    if (!extension) return "FILE"

    const ext = extension.replace(".", "").toLowerCase()

    // Common file type groups
    const imageTypes = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "ico", "tiff"]
    const documentTypes = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "odt"]
    const archiveTypes = ["zip", "rar", "7z", "tar", "gz", "bz2"]
    const codeTypes = ["js", "py", "html", "css", "java", "cpp", "c", "php", "rb", "go", "ts", "jsx", "tsx"]
    const executableTypes = ["exe", "msi", "app", "dmg", "deb", "rpm"]

    if (imageTypes.includes(ext)) return "IMG"
    if (documentTypes.includes(ext)) return "DOC"
    if (archiveTypes.includes(ext)) return "ZIP"
    if (codeTypes.includes(ext)) return "CODE"
    if (executableTypes.includes(ext)) return "EXE"

    return ext.toUpperCase().substring(0, 3)
  }

  // Function to download a resource
  function downloadResource(url, suggestedFilename) {
    chrome.downloads.download({
      url: url,
      filename: suggestedFilename,
      saveAs: true,
    })
  }

  // Handle import button click
  importBtn.addEventListener("click", () => {
    const showImages = showImagesCheckbox.checked
    const showFiles = showFilesCheckbox.checked

    const filteredResources = allResources.filter(
      (resource) => (resource.type === "image" && showImages) || (resource.type === "file" && showFiles),
    )

    if (filteredResources.length > 0) {
      filteredResources.forEach((resource) => {
        downloadResource(resource.src, resource.filename)
      })
    } else {
      alert("No resources to download")
    }
  })

  // Handle export JSON button click
  const exportJsonBtn = document.getElementById("exportJsonBtn")
  exportJsonBtn.addEventListener("click", () => {
    const showImages = showImagesCheckbox.checked
    const showFiles = showFilesCheckbox.checked

    const filteredResources = allResources.filter(
      (resource) => (resource.type === "image" && showImages) || (resource.type === "file" && showFiles),
    )

    if (filteredResources.length > 0) {
      // Create a JSON object with all resource information
      const jsonData = {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        totalResources: filteredResources.length,
        resources: filteredResources.map((resource) => ({
          type: resource.type,
          url: resource.src,
          filename: resource.filename,
          extension: resource.extension,
        })),
      }

      // Convert to JSON string
      const jsonString = JSON.stringify(jsonData, null, 2)

      // Create a Blob with the JSON data
      const blob = new Blob([jsonString], { type: "application/json" })

      // Create a URL for the Blob
      const url = URL.createObjectURL(blob)

      // Get the current tab's title to use in the filename
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabTitle = tabs[0].title || "page-resources"
        const sanitizedTitle = tabTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()

        // Download the JSON file
        chrome.downloads.download({
          url: url,
          filename: `${sanitizedTitle}-resources.json`,
          saveAs: true,
        })
      })
    } else {
      alert("No resources to export")
    }
  })

  // Handle filter changes
  showImagesCheckbox.addEventListener("change", displayResources)
  showFilesCheckbox.addEventListener("change", displayResources)

  // Start loading resources when popup opens
  getResourcesFromPage()
})

