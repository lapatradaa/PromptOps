import './homepage.css'

export default function Home() {
  return (
    <div>
      <header>
        <div className='iconContainer'>
          <img src="/icons/promptops_icon.svg"></img>
          <p>PromptOps</p>
        </div>
        <div className='signIn-signUp-Container'>
          <button className='signUp'>SIGN UP</button>
          <button className='signIn'>SIGN IN</button>
        </div>
      </header>
      <main>
        <div className='descContainer'>
          <p>Optimizes & Tests prompts for LLM with <span>PromptOps</span></p>
          <button className='startButton'>Get Start &gt;</button>
        </div>
        <img src='/images/illustration1.svg'></img>
      </main>
      <footer></footer>
    </div>
  )
}
