<script lang="ts" setup>
import { ref } from "vue";
let pages = ref("0");
let videoSrc = ref();
let cover = ref();
let frames = ref(0);

const handleImageUpload = (event) => {
  const file: File = event.target.files[0];
  let reader = new FileReader();

  reader.readAsDataURL(file);
  reader.onload = () => {
    console.log(reader);
    cover.value = String(reader.result);
  };
};

const handleVideoUpload = (event) => {
  const file: File = event.target.files[0];
  let reader = new FileReader();

  reader.readAsDataURL(file);
  reader.onload = () => {
    console.log(reader);
    videoSrc.value = String(reader.result);
  };
};
</script>

<template>
  <div>
    <section class="frame">
      <div v-show="videoSrc">
        <video class="video" controls>
          <source type="video/webm" :src="videoSrc" />
          <source type="video/mp4" :src="videoSrc" />
        </video>
        <button class="delete-button" @click="videoSrc = null">X</button>
      </div>

      <div class="file" v-show="!videoSrc">
        <label class="file__label" for="video">
          <h2>Add Video +</h2>
        </label>
        <input
          class="file__input"
          type="file"
          id="video"
          accept="video/*"
          @change="handleVideoUpload($event)"
        />
      </div>
    </section>

    <section class="frame">
      <div v-show="cover">
        <img class="cover" :src="cover" />
        <button class="delete-button" @click="cover = null">X</button>
      </div>

      <div class="file" v-show="!cover">
        <label class="file__label" for="cover">
          <h2>Add Cover +</h2>
        </label>
        <input
          class="file__input"
          type="file"
          id="cover"
          accept="image/*"
          @change="handleImageUpload($event)"
        />
      </div>
    </section>

    <section>
      <label for="pages"> Pages:</label>
      <input v-model="pages" type="range" min="0" :max="frames" />
      <input id="pages" v-model="pages" type="number" />
    </section>
  </div>
</template>

<style>
:root {
  --frame-width: 420px;
  --frame-height: 250px;
  --border-width: 4px;
  --bg-color: var(--main-color);
}

label {
  cursor: pointer;
}

.file {
  position: relative;
}
.file__label {
  display: block;
  width: var(--frame-width);
  height: var(--frame-height);
  text-align: center;
  line-height: var(--frame-height);
}

.file__input {
  position: absolute;
  opacity: 0;
}

.frame {
  width: var(--frame-width);
  height: var(--frame-height);
  border: var(--border-width) solid var(--bg-color);
  box-sizing: content-box;
  margin-bottom: 1em;
}

.frame:hover {
  background-color: var(--main-color-a);
}

.video {
  width: var(--frame-width);
  height: var(--frame-height);
}

.cover {
  width: var(--frame-width);
  height: var(--frame-height);
}

.delete-button {
  position: absolute;
  top: 0;
  width: 3em;
  height: 3em;
  border: none;
  right: -4em;
  font-weight: 500;
  background-color: var(--bg-color);
  padding: 0.5rem;
  border-radius: 50%;
  cursor: pointer;
  color: var(--color-text);
  line-height: 1.6;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
  font-size: 15px;
}

.delete-button::before {
  content: "";
  width: 3em;
  height: 3em;
  background: var(--bg-color);
  display: block;
  position: absolute;
  top: 0;
  left: -1.5em;
  z-index: -1;
}
</style>
