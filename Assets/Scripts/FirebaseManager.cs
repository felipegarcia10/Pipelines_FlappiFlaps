using UnityEngine;
using System.Runtime.InteropServices;

public class FirebaseManager : MonoBehaviour
{
    public static FirebaseManager Instance {  get; private set; }

    public bool IsAuthenticated { get; private set; } = false;
    public string UserID { get; private set; } = "";
    public string DisplayName { get; private set; } = "Player";
    public string IdToken { get; private set; } = "";
    public string ProjectId { get; private set; } = "";

    #if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")] private static extern void InitFirebaseBridge();
    [DllImport("__Internal")] private static extern void SubmitScoreToFirestore(string jsonBody);
    #else
    private static void InitFirebaseBridge()
        => Debug.Log("InitFirebaseBridge Stub");
    private static void SubmitScoreToFirestore(string jsonBody)
        => Debug.Log("SubmitScoreToFirestore stub");
    #endif
    private void Awake()
    {
        if(Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }
    private void Start()
    {
        InitFirebaseBridge();
    }
    public void OnAuthReceived(string json)
    {
        Debug.Log($"Auth received: {json}");

        var data = JsonUtility.FromJson<AuthPayload>(json);
        UserID = data.uid;
        IdToken = data.idToken;
        DisplayName = data.displayName;
        ProjectId = data.projectId;
        IsAuthenticated = !string.IsNullOrEmpty(UserID) && !string.IsNullOrEmpty(IdToken);

        Debug.Log($"User Authenticated as {DisplayName}, UID: {UserID}");
    }

    public void SubmitScore(int score, int pipes, int duration)
    {
        if (!IsAuthenticated)
        {
            Debug.Log("Not Authenticated. Score not submitted");
            return;
        }
        var payload = new ScorePayload
        {
            score = score,
            pipes = pipes,
            duration = duration
        };

        string json = JsonUtility.ToJson(payload);
        SubmitScoreToFirestore(json);
    }


    [System.Serializable]
    private class AuthPayload
    {
        public string uid;
        public string idToken;
        public string displayName;
        public string projectId;
    }
    [System.Serializable]
    private class ScorePayload
    {
        public int score;
        public int pipes;
        public int duration;
    }
}
