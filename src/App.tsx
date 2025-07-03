import { BeamsBackground } from "./components/ui/beams-background"


const App = () => {
  return (
    <div>
      <BeamsBackground intensity="strong" interactive={false} colorScheme="purple" customHue={300} customSaturation={80} customLightness={90} />
    </div>
  )
}

export default App
