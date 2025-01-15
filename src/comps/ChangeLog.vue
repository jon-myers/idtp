<template>
  <div class='changelog-wrapper'>
    <div class='markdown-container'>
      <Changelog />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
// import Markdown from 'vue3-markdown-it'
import Changelog from '@/CHANGELOG.md'

// import changelogUrl from '@/CHANGELOG.md?raw'


export default defineComponent({
  name: 'ChangeLog',
  components: {
    Changelog
  },
  setup() {
    const changelog = ref<string>('')

    // onMounted(() => {
    //   changelog.value = changelogUrl
    //   console.log(changelog.value)
    // })

    return {
      changelog
    }
  }
})
</script>

<style scoped>
/* Wrapper to occupy full viewport height and arrange content vertically */
.changelog-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 20px; /* Added padding for breathing space */
  background-color: #f9f9f9; /* Light background for contrast */
}

/* Container for the markdown content with scroll capability */
.markdown-container {
  flex: 1;
  overflow: auto;
  width: 100%;
  box-sizing: border-box;
  padding: 20px;
}

/* Styling the main title */
.changelog-wrapper h1 {
  font-size: 2em;
  margin-bottom: 20px;
  color: #333;
  text-align: left; /* Ensure the main title is left-aligned */
}

/* Apply styles deep into the Markdown component */
::v-deep .markdown-body {
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.6;
  color: #333;
  text-align: left; /* Ensure all markdown content is left-aligned */
}

/* Heading styles */
::v-deep .markdown-body h1,
::v-deep .markdown-body h2,
::v-deep .markdown-body h3 {
  color: #2c3e50;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: bold;
  text-align: left; /* Ensure headings are left-aligned */
}

/* Paragraph styles */
::v-deep .markdown-body p {
  margin-bottom: 1em;
  color: #555;
  text-align: left; /* Ensure paragraphs are left-aligned */
}

/* Unordered list styles */
::v-deep .markdown-body ul {
  margin-left: 1.5em;
  list-style-type: disc;
  color: #555;
  text-align: left; /* Ensure list items are left-aligned */
}

/* List item styles */
::v-deep .markdown-body li {
  margin-bottom: 0.5em;
}

/* Inline code styles */
::v-deep .markdown-body code {
  background-color: #eef;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
  color: #c7254e;
}

/* Blockquote styles */
::v-deep .markdown-body blockquote {
  border-left: 4px solid #ccc;
  padding-left: 16px;
  color: #777;
  margin: 1em 0;
  text-align: left; /* Ensure blockquotes are left-aligned */
}

/* Link styles */
::v-deep .markdown-body a {
  color: #3498db;
  text-decoration: none;
  text-align: left; /* Ensure links are left-aligned */
}

::v-deep .markdown-body a:hover {
  text-decoration: underline;
}

/* Horizontal rule styles */
::v-deep .markdown-body hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 2em 0;
}

/* Table styles */
::v-deep .markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1em;
  text-align: left; /* Ensure table content is left-aligned */
}

::v-deep .markdown-body th,
::v-deep .markdown-body td {
  border: 1px solid #ddd;
  padding: 8px;
}

/* Header cells */
::v-deep .markdown-body th {
  background-color: #f2f2f2;
  text-align: left; /* Ensure table headers are left-aligned */
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .changelog-wrapper {
    padding: 10px;
  }

  .markdown-container {
    padding: 10px;
  }

  ::v-deep .markdown-body h1 {
    font-size: 1.5em;
  }
}
</style>
