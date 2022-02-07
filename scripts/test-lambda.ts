import { handler } from '../lambda/index'

async function main() {
  // TODO: build artificial event with current date

  const event = {
    awslogs: {
      data: 'H4sIAAAAAAAAA7WUUW/aMBDHv0qUp1YCEjtxSCJNE9pYn9ZJwNtSVSY5wCWxM9uBoarffZfQUVSmirEVCcn5393Pd2f7Ht0KjOFLmO1qcFP382g2uv86nk5HN2O356qtBI0yoUHIomGc+ISiXKrljVZNjZZq1+d13S9gs9enVgOv0CD6fhEuWBEwykIyZ4s499CzFDm3QskB+mKEaeYm16JupS+itKCNm353xxvQO7sScunedVgUpG1Nj64okB5EUUSpH0Qxoz6uWcyGhFJGUUzCMCYhYcGQhoSQaBglLMGlT7rkrcCSLa8wexKFNEl8f0hIQHq/W4H4x8wtYQNl5qaZK+RCZW4v6yKz11GZW5ll54dpLqFwtsKunFpIjHlyn3r/lnDwHgmvlLGd43a7HXCrqrkGiQc9KKALq7lddXbPqAq89vPjvOQfaGetwK5U0dlvxrO99I4dCC/pwJZr+eaRQaX0Dg1sGMYBjcKjIrjTRuPVc57h/6MKdkkVoLXSb5WBDqhijMXX24WMDyGH5FG1uK/zQsMk8vWLe+oc2TPp4I9bZ8VlUYJ2rtpX6w0k/LSeAY0PEy/EEgzKwsNbMXgwaRimJLh+if02f4DcDtBjAkaVmwNGqgLuK1U0JQI6ZCHMgYv+/caK0rRM7FpK2BG01irHmmYiX5uRLCbQ7oFjwzhXLTYVEqeH5KX37OhZbtb3PxpowKRJlB6zuNnJ3LnFBG4xdNptP9CNHNXirExbob9ft7kGJEmTE/xzFxbyLOScGzhChnGUBsMTZjtBd59WkK9nuoGzwDio7Z5JiJ8G9IQ52TvAT8hx8ZdMynz8n9HaS5rAkjilp419Bd/f1AngUeM1vmCbwGcp9a/xnR+Nge45OKo7Q+ePg+3u6Rd1SiSTPgcAAA==',
    },
  }

  await handler(event)
}

main().catch(console.error)
